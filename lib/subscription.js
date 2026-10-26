// Who has premium. Subscriptions are written only here, with the service role, from the payment provider's
// webhook (app/api/billing/*); people can read their own row (RLS). Server only.
import { PREMIUM, followLimit, isPlan, PLANS } from "@/lib/premium";

const DAY = 864e5;
// A failed renewal keeps the plan for a few days while the provider retries the card.
export const GRACE_DAYS = 3;

/** Does this subscription row give premium right now? Cancelled plans keep working until the period ends. */
export function isActive(row, now = new Date()) {
  if (!PREMIUM || !row) return false;
  const end = new Date(row.current_period_end).getTime();
  if (!Number.isFinite(end)) return false;
  const t = new Date(now).getTime();
  if (row.status === "active" || row.status === "canceled") return t < end;
  if (row.status === "past_due") return t < end + GRACE_DAYS * DAY;
  return false;
}

/** The person's subscription row, or null. `db` is the service-role client or their own session (RLS). */
export async function getSubscription(db, userId) {
  if (!db || !userId) return null;
  const { data, error } = await db.from("subscriptions").select("status, plan, provider, provider_ref, current_period_end, cancel_at_period_end, canceled_at").eq("user_id", userId).maybeSingle();
  if (error) {
    // Before migration 009 has run the table doesn't exist: everyone is on the free tier.
    console.warn("subscription lookup failed:", error.message);
    return null;
  }
  return data || null;
}

/** { premium, limit, sub } for one person. */
export async function planOf(db, userId, now = new Date()) {
  const sub = PREMIUM ? await getSubscription(db, userId) : null;
  const premium = isActive(sub, now);
  return { premium, limit: followLimit(premium), sub };
}

/** The ids, among `ids`, that have premium right now (for the alerts run). */
export async function premiumIds(db, ids, now = new Date()) {
  const out = new Set();
  if (!PREMIUM || !ids.length) return out;
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from("subscriptions").select("user_id, status, current_period_end").in("user_id", ids.slice(i, i + 200));
    if (error) { console.warn("premium lookup failed:", error.message); return out; }
    for (const r of data || []) if (isActive(r, now)) out.add(r.user_id);
  }
  return out;
}

// The end of a paid period that starts now.
export function periodEnd(plan, from = new Date()) {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + (PLANS[plan]?.months || 1));
  return d.toISOString();
}

/** A payment went through (first charge or a renewal): the plan runs until periodEnd. */
export async function activate(db, { userId, plan, provider, providerRef = null, until }) {
  if (!isPlan(plan)) throw new Error("activate: bad plan");
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId, status: "active", plan, provider, provider_ref: providerRef,
    current_period_end: until || periodEnd(plan), cancel_at_period_end: false, canceled_at: null, updated_at: now,
  }, { onConflict: "user_id" });
  if (error) throw new Error(`activate: ${error.message}`);
}

/** Cancelled: no more charges; the plan keeps working until the end of the period already paid for. */
export async function markCanceled(db, userId) {
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").update({ status: "canceled", cancel_at_period_end: true, canceled_at: now, updated_at: now }).eq("user_id", userId);
  if (error) throw new Error(`cancel: ${error.message}`);
}

/** A renewal failed; the provider retries. Premium continues for GRACE_DAYS after the period end. */
export async function markPastDue(db, userId) {
  const { error } = await db.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "active");
  if (error) throw new Error(`past due: ${error.message}`);
}

/** The provider gave up (or the plan was refunded): back to the free tier now. */
export async function markExpired(db, userId) {
  const { error } = await db.from("subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (error) throw new Error(`expire: ${error.message}`);
}

/** Has this provider event been handled already? (a repeat delivery) */
export async function handled(db, provider, id) {
  const { data, error } = await db.from("billing_events").select("id").eq("id", `${provider}:${id}`).maybeSingle();
  if (error) throw new Error(`billing event: ${error.message}`);
  return Boolean(data);
}

/** Records a provider event after it was applied, so a failed attempt is retried rather than skipped. */
export async function recordEvent(db, { id, provider, kind, userId = null }) {
  const { error } = await db.from("billing_events").upsert({ id: `${provider}:${id}`, provider, kind, user_id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`billing event: ${error.message}`);
}
