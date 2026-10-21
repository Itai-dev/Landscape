// Who gets this edition, and sending it. Used by the daily cron and the admin test route. Server only.
import { composeDigest, dueFor, editionOf, PERIOD_DAYS, siteUrl } from "@/lib/digest";
import { renderDigestEmail } from "@/lib/digestEmail";
import { sendBatch, unsubscribeToken, tokensReady, missingSendEnv, sender } from "@/lib/mailer";

const BATCH = 50; // Resend accepts up to 100 per batch call
// The cron runs daily; an edition is sent on its Sunday and caught up on the next two days
// (Resend's free plan allows 100 emails a day).
const CATCH_UP_DAYS = 2;

export function message({ userId, email, prefs, crafts, follows = [], now, base = siteUrl() }) {
  const days = PERIOD_DAYS[prefs.frequency] || 7;
  const since = prefs.last_sent_at ? String(prefs.last_sent_at).slice(0, 10) : null;
  const d = composeDigest({ crafts, topics: prefs.topics || [], follows, days, now, base, since });
  const signed = userId && tokensReady();
  const unsubscribeUrl = signed ? `${base}/digest/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}` : `${base}/digest/settings`;
  const oneClick = signed ? `${base}/api/digest/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}` : null;
  const { subject, html, text } = renderDigestEmail(d, { base, unsubscribeUrl, prefsUrl: `${base}/digest/settings` });
  const contact = sender().contact;
  const listUnsubscribe = [
    contact ? `<mailto:${contact}?subject=${encodeURIComponent("הסרה מהניוזלטר")}>` : null,
    `<${oneClick || unsubscribeUrl}>`,
  ].filter(Boolean).join(", ");
  return {
    digest: d,
    email: {
      to: [email],
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": listUnsubscribe,
        ...(oneClick ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}),
      },
      tags: [{ name: "edition", value: d.edition.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    },
  };
}

// Everyone with a confirmed address, recorded consent and the digest on (public.digest_recipients,
// service role only). The address always comes from auth.users, never from a column people can edit.
async function recipients(db) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.rpc("digest_recipients").range(from, from + 999);
    if (error) throw new Error(`recipients: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/**
 * runDigest(db, { now, limit }) — sends the current edition to readers who are due and haven't got it.
 * At most once per reader per edition: a "pending" row in digest_sends is claimed before sending, so a
 * crash or a second run can't send twice. Returns counts, including how many are left for tomorrow.
 */
export async function runDigest(db, { now = new Date(), limit = 90 } = {}) {
  const edition = editionOf(now);
  const age = Math.round((new Date(now).getTime() - new Date(`${edition}T00:00:00Z`).getTime()) / 864e5);
  if (age > CATCH_UP_DAYS) return { edition, skipped: "outside_send_window" };
  const missing = missingSendEnv();
  if (missing.length) return { edition, skipped: "missing_env", missing };

  const all = await recipients(db);
  const due = all.filter((p) => p.email && dueFor(p.frequency, edition));
  if (!due.length) return { edition, due: 0, sent: 0, remaining: 0 };

  const { data: done } = await db.from("digest_sends").select("user_id").eq("edition", edition).in("user_id", due.map((p) => p.user_id));
  const already = new Set((done || []).map((r) => r.user_id));
  const waiting = due.filter((p) => !already.has(p.user_id));
  const todo = waiting.slice(0, limit);

  // Readers who chose no crafts get the crafts from their profile, if they have one.
  const noCrafts = todo.filter((p) => !p.crafts?.length).map((p) => p.user_id);
  const profileCrafts = new Map();
  if (noCrafts.length) {
    const { data: profiles } = await db.from("profiles").select("user_id, crafts").in("user_id", noCrafts);
    for (const r of profiles || []) profileCrafts.set(r.user_id, r.crafts || []);
  }

  // The companies each reader keeps in their tracking list ("במעקב שלכם" at the top of their edition).
  const follows = new Map();
  if (todo.length) {
    // Reading them must never stop the send: without them the edition just has no "במעקב שלכם".
    try {
      const { data: rows } = await db.from("org_follows").select("user_id, org_id").in("user_id", todo.map((p) => p.user_id));
      for (const r of rows || []) follows.set(r.user_id, [...(follows.get(r.user_id) || []), r.org_id]);
    } catch (e) { console.error("digest follows read failed", e?.message); }
  }

  let sent = 0, empty = 0, failed = 0, claimedElsewhere = 0;
  const base = siteUrl();
  const emptyRows = [];
  const queue = [];
  for (const p of todo) {
    const crafts = p.crafts?.length ? p.crafts : profileCrafts.get(p.user_id) || [];
    const m = message({ userId: p.user_id, email: p.email, prefs: p, crafts, follows: follows.get(p.user_id) || [], now, base });
    if (m.digest.empty) {
      emptyRows.push({ user_id: p.user_id, edition, status: "skipped_empty" });
      empty++;
    } else queue.push({ p, m });
  }
  if (emptyRows.length) await db.from("digest_sends").upsert(emptyRows, { onConflict: "user_id,edition", ignoreDuplicates: true });

  for (let i = 0; i < queue.length; i += BATCH) {
    const chunk = queue.slice(i, i + BATCH);
    // Claim: insert "pending" rows; only the rows this run inserted are sent.
    const { data: claimed, error: claimError } = await db.from("digest_sends")
      .upsert(chunk.map((c) => ({ user_id: c.p.user_id, edition, status: "pending" })), { onConflict: "user_id,edition", ignoreDuplicates: true })
      .select("user_id");
    if (claimError) { console.error("digest claim failed", claimError.message); failed += chunk.length; continue; }
    const mine = new Set((claimed || []).map((r) => r.user_id));
    const go = chunk.filter((c) => mine.has(c.p.user_id));
    claimedElsewhere += chunk.length - go.length;
    if (!go.length) continue;
    try {
      const res = await sendBatch(go.map((c) => c.m.email), { idempotencyKey: `digest-${edition}-${go[0].p.user_id}-${go.length}` });
      if (res.skipped) {
        await db.from("digest_sends").delete().eq("edition", edition).eq("status", "pending").in("user_id", go.map((c) => c.p.user_id));
        return { edition, due: due.length, skipped: res.skipped, wouldSend: queue.length, empty };
      }
      // Mark each as sent. If this fails the rows stay "pending": never sent twice, at worst missed once.
      await Promise.all(go.map((c, k) => db.from("digest_sends").update({ status: "sent", message_id: res.ids[k] || null }).eq("user_id", c.p.user_id).eq("edition", edition)));
      await db.from("newsletter_prefs").update({ last_sent_at: new Date(now).toISOString() }).in("user_id", go.map((c) => c.p.user_id));
      sent += go.length;
    } catch (e) {
      // Resend refused the batch before accepting it: release the claim so tomorrow's run retries.
      console.error("digest batch failed", e.message);
      await db.from("digest_sends").delete().eq("edition", edition).eq("status", "pending").in("user_id", go.map((c) => c.p.user_id));
      failed += go.length;
    }
  }
  return { edition, due: due.length, sent, empty, failed, claimedElsewhere, remaining: Math.max(waiting.length - todo.length, 0) + failed };
}
