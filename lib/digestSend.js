// Who gets this edition, and sending it. Used by the daily cron and the admin test route. Server only.
import { composeDigest, dueFor, editionOf, PERIOD_DAYS, siteUrl } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/digestEmail";
import { sendBatch, unsubscribeToken, tokensReady } from "@/lib/mailer";

const BATCH = 50; // Resend accepts up to 100 per batch call
// The cron runs daily; an edition is sent on its Sunday and caught up on the next two days
// (Resend's free plan allows 100 emails a day).
const CATCH_UP_DAYS = 2;

export function message({ userId, email, prefs, crafts, now, base = siteUrl() }) {
  const days = PERIOD_DAYS[prefs.frequency] || 7;
  const d = composeDigest({ crafts, topics: prefs.topics || [], days, now, base });
  const unsubscribeUrl = userId && tokensReady() ? `${base}/digest/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}` : `${base}/digest/settings`;
  const oneClick = userId && tokensReady() ? `${base}/api/digest/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}` : null;
  const { subject, html, text } = renderDigestEmail(d, { base, unsubscribeUrl, prefsUrl: `${base}/digest/settings` });
  return {
    digest: d,
    email: {
      to: [email],
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": oneClick ? `<${oneClick}>` : `<${unsubscribeUrl}>`,
        ...(oneClick ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}),
      },
      tags: [{ name: "edition", value: d.edition.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    },
  };
}

/**
 * runDigest(db, { now, limit }) — sends the current edition to readers who are due and haven't got it.
 * Idempotent through digest_sends (one row per reader per edition). Returns counts.
 */
export async function runDigest(db, { now = new Date(), limit = 90 } = {}) {
  const edition = editionOf(now);
  const age = Math.round((new Date(now).getTime() - new Date(`${edition}T00:00:00Z`).getTime()) / 864e5);
  if (age > CATCH_UP_DAYS) return { edition, skipped: "outside_send_window" };

  const { data: prefs, error } = await db
    .from("newsletter_prefs")
    .select("user_id, email, frequency, crafts, topics, consent_at")
    .neq("frequency", "off")
    .not("consent_at", "is", null)
    .limit(5000);
  if (error) throw new Error(`prefs: ${error.message}`);
  const due = (prefs || []).filter((p) => p.email && dueFor(p.frequency, edition));
  if (!due.length) return { edition, due: 0, sent: 0 };

  const { data: done } = await db.from("digest_sends").select("user_id").eq("edition", edition).in("user_id", due.map((p) => p.user_id));
  const already = new Set((done || []).map((r) => r.user_id));
  const todo = due.filter((p) => !already.has(p.user_id)).slice(0, limit);

  // Readers who chose no crafts get the crafts from their profile, if they have one.
  const noCrafts = todo.filter((p) => !p.crafts?.length).map((p) => p.user_id);
  const profileCrafts = new Map();
  if (noCrafts.length) {
    const { data: profiles } = await db.from("profiles").select("user_id, crafts").in("user_id", noCrafts);
    for (const r of profiles || []) profileCrafts.set(r.user_id, r.crafts || []);
  }

  let sent = 0, empty = 0, failed = 0;
  const base = siteUrl();
  const rows = [];
  const queue = [];
  for (const p of todo) {
    const crafts = p.crafts?.length ? p.crafts : profileCrafts.get(p.user_id) || [];
    const m = message({ userId: p.user_id, email: p.email, prefs: p, crafts, now, base });
    if (m.digest.empty) {
      rows.push({ user_id: p.user_id, edition, status: "skipped_empty" });
      empty++;
    } else queue.push({ p, m });
  }
  for (let i = 0; i < queue.length; i += BATCH) {
    const chunk = queue.slice(i, i + BATCH);
    try {
      const res = await sendBatch(chunk.map((c) => c.m.email), { idempotencyKey: `digest-${edition}-${chunk[0].p.user_id}-${chunk.length}` });
      if (res.skipped) return { edition, due: due.length, skipped: res.skipped, wouldSend: queue.length, empty };
      chunk.forEach((c, k) => rows.push({ user_id: c.p.user_id, edition, status: "sent", message_id: res.ids[k] || null }));
      sent += chunk.length;
    } catch (e) {
      console.error("digest batch failed", e.message);
      failed += chunk.length; // not logged, so tomorrow's run retries them
    }
  }
  if (rows.length) {
    const { error: logError } = await db.from("digest_sends").upsert(rows, { onConflict: "user_id,edition" });
    if (logError) console.error("digest_sends log failed", logError.message);
    const sentIds = rows.filter((r) => r.status === "sent").map((r) => r.user_id);
    if (sentIds.length) await db.from("newsletter_prefs").update({ last_sent_at: new Date(now).toISOString() }).in("user_id", sentIds);
  }
  return { edition, due: due.length, remaining: Math.max(due.length - already.size - todo.length, 0), sent, empty, failed };
}
