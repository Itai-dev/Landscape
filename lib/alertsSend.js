// The daily alerts run: one email per person bundling every new update on the companies they follow.
// Used by /api/cron/alerts. Server only.
import { createHash, randomUUID } from "node:crypto";
import { recentSignals, alertItems, alertDue, seenDay, SIGNALS } from "@/lib/alerts";
import { renderAlertEmail } from "@/lib/alertsEmail";
import { siteUrl } from "@/lib/digest";
import { todayIL } from "@/lib/digestSchedule";
import { sendBatch, listToken, tokensReady, missingSendEnv, sender } from "@/lib/mailer";

const BATCH = 50;
const IN_CHUNK = 200; // ids per ".in()" filter

export function alertMessage({ userId, email, mode, items, base = siteUrl() }) {
  const signed = userId && tokensReady();
  const token = signed ? listToken("alerts", userId) : "";
  const unsubscribeUrl = signed ? `${base}/alerts/unsubscribe?u=${userId}&t=${token}` : `${base}/me`;
  const oneClick = signed ? `${base}/api/alerts/unsubscribe?u=${userId}&t=${token}` : null;
  const { subject, html, text } = renderAlertEmail(items, { mode, base, unsubscribeUrl, manageUrl: `${base}/me#follows` });
  const contact = sender().contact;
  const listUnsubscribe = [
    contact ? `<mailto:${contact}?subject=${encodeURIComponent("הפסקת התראות")}>` : null,
    `<${oneClick || unsubscribeUrl}>`,
  ].filter(Boolean).join(", ");
  return {
    to: [email],
    subject,
    html,
    text,
    headers: { "List-Unsubscribe": listUnsubscribe, ...(oneClick ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}) },
    tags: [{ name: "kind", value: "alert" }],
  };
}

async function recipients(db) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.rpc("alert_recipients").range(from, from + 999);
    if (error) throw new Error(`alert recipients: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function inChunks(ids, fn) {
  const rows = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) rows.push(...(await fn(ids.slice(i, i + IN_CHUNK))));
  return rows;
}

/**
 * The Israeli day each update was first seen on the live site. A research PR can be merged days after the
 * update's own `added` date; counting from when it first appears here means it still alerts. The first run
 * on an empty table records history at each update's own day, so nothing old is sent as new.
 */
export async function firstSeen(db, signals, now = new Date()) {
  const { data, error } = await db.from("signal_seen").select("signal_id, first_seen_at");
  if (error) {
    console.warn("signal_seen unavailable, using each update's own day:", error.message);
    return seenDay;
  }
  const map = new Map((data || []).map((r) => [r.signal_id, todayIL(new Date(r.first_seen_at))]));
  const bootstrap = map.size === 0;
  const stamp = new Date(now).toISOString();
  const fresh = signals.filter((s) => !map.has(s.id)).map((s) => ({
    signal_id: s.id,
    first_seen_at: bootstrap ? `${seenDay(s)}T12:00:00+03:00` : stamp,
  }));
  if (fresh.length) {
    const { error: e2 } = await db.from("signal_seen").upsert(fresh, { onConflict: "signal_id", ignoreDuplicates: true });
    if (e2) console.warn("signal_seen write failed:", e2.message);
    for (const r of fresh) map.set(r.signal_id, todayIL(new Date(r.first_seen_at)));
  }
  return (s) => map.get(s.id) || seenDay(s);
}

// Emails already sent today (digest + alerts), so alerts stay inside the shared daily sending budget.
async function sentToday(db, day) {
  const since = `${day}T00:00:00+03:00`;
  let n = 0;
  for (const table of ["digest_sends", "alert_sends"]) {
    const { count, error } = await db.from(table).select("user_id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since);
    if (!error && typeof count === "number") n += count;
  }
  return n;
}

/**
 * runAlerts(db, { now, limit, signals }) — sends today's alerts to people who are due.
 * At most once per person per update: "pending" rows in alert_sends are claimed before sending, so a crash
 * or a second run can't send the same update twice. Returns counts.
 */
export async function runAlerts(db, { now = new Date(), limit = 40, signals } = {}) {
  const day = todayIL(now);
  const missing = missingSendEnv();
  if (missing.length) return { day, skipped: "missing_env", missing };
  const seen = await firstSeen(db, signals || SIGNALS, now);
  const recent = recentSignals({ now, signals: signals || SIGNALS, seen });
  if (!recent.length) return { day, due: 0, sent: 0, note: "no_new_updates" };

  const due = (await recipients(db)).filter((r) => r.email && alertDue(r.alerts, r.alerts_last_sent_at, now));
  if (!due.length) return { day, due: 0, sent: 0 };
  const ids = due.map((r) => r.user_id);
  const follows = await inChunks(ids, async (part) => {
    const { data, error } = await db.from("org_follows").select("user_id, org_id, created_at").in("user_id", part);
    if (error) throw new Error(`follows: ${error.message}`);
    return data || [];
  });
  const sentRows = await inChunks(ids, async (part) => {
    const { data, error } = await db.from("alert_sends").select("user_id, signal_id").in("user_id", part).in("signal_id", recent.map((s) => s.id));
    if (error) throw new Error(`alert sends: ${error.message}`);
    return data || [];
  });
  const followsBy = new Map();
  for (const f of follows) (followsBy.get(f.user_id) || followsBy.set(f.user_id, []).get(f.user_id)).push(f);
  const sentBy = new Map();
  for (const r of sentRows) (sentBy.get(r.user_id) || sentBy.set(r.user_id, new Set()).get(r.user_id)).add(r.signal_id);

  const base = siteUrl();
  const withItems = [];
  for (const r of due) {
    const items = alertItems({ follows: followsBy.get(r.user_id) || [], signals: recent, sent: sentBy.get(r.user_id), base, seen });
    if (items.length) withItems.push({ r, items });
  }
  // Resend's free plan allows 100 emails a day across everything we send; the digest runs first (04:00 UTC).
  const budget = Number(process.env.DAILY_SEND_BUDGET) || 100;
  const room = Math.max(0, Math.min(limit, budget - (await sentToday(db, day).catch(() => 0))));
  const todo = withItems.slice(0, room);
  const run = randomUUID(); // claims carry the run that made them, so a failed run releases only its own
  let sent = 0, failed = 0, claimedElsewhere = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const claimRows = chunk.flatMap(({ r, items }) => items.map((it) => ({ user_id: r.user_id, signal_id: it.id, status: "pending", batch: day, claim: run })));
    const { data: claimed, error: claimError } = await db.from("alert_sends")
      .upsert(claimRows, { onConflict: "user_id,signal_id", ignoreDuplicates: true })
      .select("user_id, signal_id");
    if (claimError) { console.error("alert claim failed", claimError.message); failed += chunk.length; continue; }
    const mine = new Set((claimed || []).map((c) => `${c.user_id}|${c.signal_id}`));
    // Only the updates this run claimed go into each email.
    const go = chunk
      .map(({ r, items }) => ({ r, items: items.filter((it) => mine.has(`${r.user_id}|${it.id}`)) }))
      .filter((x) => x.items.length);
    claimedElsewhere += chunk.length - go.length;
    if (!go.length) continue;
    const release = () => db.from("alert_sends").delete().eq("status", "pending").eq("claim", run);
    // Same people and updates → same key, so a retry of a batch Resend already accepted is never delivered twice.
    const pairs = go.flatMap((x) => x.items.map((it) => `${x.r.user_id}|${it.id}`)).sort().join(",");
    const idempotencyKey = `alerts-${createHash("sha256").update(pairs).digest("hex").slice(0, 48)}`;
    try {
      const res = await sendBatch(go.map((x) => alertMessage({ userId: x.r.user_id, email: x.r.email, mode: x.r.alerts, items: x.items, base })),
        { idempotencyKey });
      if (res.skipped) {
        await release();
        return { day, due: due.length, skipped: res.skipped, wouldSend: withItems.length };
      }
      // Mark as sent. If this fails the rows stay "pending": never sent twice, at worst missed once.
      await Promise.all(go.map((x, k) => db.from("alert_sends").update({ status: "sent", message_id: res.ids[k] || null })
        .eq("claim", run).eq("user_id", x.r.user_id).in("signal_id", x.items.map((it) => it.id))));
      await db.from("newsletter_prefs").update({ alerts_last_sent_at: new Date(now).toISOString() }).in("user_id", go.map((x) => x.r.user_id));
      sent += go.length;
    } catch (e) {
      if (typeof e.status === "number") {
        // Resend answered with an error, so nothing was accepted: release this run's claim so the next run retries.
        console.error("alert batch refused", e.message);
        await release();
      } else {
        // No answer (timeout or network): the batch may have gone out. Keep the claim, so at worst it's missed once
        // and never sent twice.
        console.error("alert batch outcome unknown, keeping the claim", e.message);
      }
      failed += go.length;
    }
  }
  return { day, due: due.length, withUpdates: withItems.length, sent, failed, claimedElsewhere, budget: room, remaining: Math.max(withItems.length - todo.length, 0) + failed };
}
