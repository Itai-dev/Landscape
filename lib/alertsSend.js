// The daily alerts run: one email per person bundling every new update on the companies they follow.
// Used by /api/cron/alerts. Server only.
import { recentSignals, alertItems, alertDue } from "@/lib/alerts";
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
 * runAlerts(db, { now, limit, signals }) — sends today's alerts to people who are due.
 * At most once per person per update: "pending" rows in alert_sends are claimed before sending, so a crash
 * or a second run can't send the same update twice. Returns counts.
 */
export async function runAlerts(db, { now = new Date(), limit = 40, signals } = {}) {
  const day = todayIL(now);
  const missing = missingSendEnv();
  if (missing.length) return { day, skipped: "missing_env", missing };
  const recent = signals || recentSignals({ now });
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
    const items = alertItems({ follows: followsBy.get(r.user_id) || [], signals: recent, sent: sentBy.get(r.user_id), base });
    if (items.length) withItems.push({ r, items });
  }
  const todo = withItems.slice(0, limit);
  let sent = 0, failed = 0, claimedElsewhere = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const claimRows = chunk.flatMap(({ r, items }) => items.map((it) => ({ user_id: r.user_id, signal_id: it.id, status: "pending", batch: day })));
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
    const release = () => db.from("alert_sends").delete().eq("status", "pending").eq("batch", day)
      .in("user_id", go.map((x) => x.r.user_id)).in("signal_id", [...new Set(go.flatMap((x) => x.items.map((it) => it.id)))]);
    try {
      const res = await sendBatch(go.map((x) => alertMessage({ userId: x.r.user_id, email: x.r.email, mode: x.r.alerts, items: x.items, base })),
        { idempotencyKey: `alerts-${day}-${go[0].r.user_id}-${go.length}` });
      if (res.skipped) {
        await release();
        return { day, due: due.length, skipped: res.skipped, wouldSend: withItems.length };
      }
      // Mark as sent. If this fails the rows stay "pending": never sent twice, at worst missed once.
      await Promise.all(go.map((x, k) => db.from("alert_sends").update({ status: "sent", message_id: res.ids[k] || null })
        .eq("user_id", x.r.user_id).in("signal_id", x.items.map((it) => it.id))));
      await db.from("newsletter_prefs").update({ alerts_last_sent_at: new Date(now).toISOString() }).in("user_id", go.map((x) => x.r.user_id));
      sent += go.length;
    } catch (e) {
      // Resend refused the batch before accepting it: release the claim so tomorrow's run retries.
      console.error("alert batch failed", e.message);
      await release();
      failed += go.length;
    }
  }
  return { day, due: due.length, withUpdates: withItems.length, sent, failed, claimedElsewhere, remaining: Math.max(withItems.length - todo.length, 0) + failed };
}
