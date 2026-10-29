// Who has premium. Subscriptions are written only here, with the service role, from the payment provider's
// webhook (app/api/billing/*); people can read their own row (RLS). Server only.
import { PREMIUM, followLimit, isPlan, PLANS, periodEnd } from "@/lib/premium";
import { billingReady } from "@/lib/billing/index";

export { periodEnd };

const DAY = 864e5;
// A failed renewal keeps the plan for a few days while the provider retries the card.
export const GRACE_DAYS = 3;

/** Does this subscription row give premium right now? Cancelled plans keep working until the period ends. */
export function isActive(row, now = new Date()) {
  return PREMIUM && paidUp(row, now);
}

// The same, whether or not premium is switched on (billing records keep their meaning either way).
function paidUp(row, now = new Date()) {
  if (!row) return false;
  const end = new Date(row.current_period_end).getTime();
  if (!Number.isFinite(end)) return false;
  const t = new Date(now).getTime();
  if (row.status === "active" || row.status === "canceled") return t < end;
  if (row.status === "past_due") return t < end + GRACE_DAYS * DAY;
  return false;
}

const SUB_COLUMNS = "status, plan, provider, provider_ref, current_period_end, cancel_at_period_end, canceled_at, started_at, period_start, amount, refund_amount, refunded_at, refund_due";

/** The person's subscription row, or null. `db` is the service-role client or their own session (RLS). */
export async function getSubscription(db, userId) {
  if (!db || !userId) return null;
  const { data, error } = await db.from("subscriptions").select(SUB_COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) {
    // Before migration 009 has run the table doesn't exist: everyone is on the free tier.
    console.warn("subscription lookup failed:", error.message);
    return null;
  }
  return data || null;
}

/** { premium, limit, sub, paywall } for one person. `paywall`: payments are open, so the free limit applies. */
export async function planOf(db, userId, now = new Date()) {
  const sub = PREMIUM ? await getSubscription(db, userId) : null;
  const premium = isActive(sub, now);
  const paywall = billingReady();
  return { premium, limit: followLimit(premium, paywall), sub, paywall };
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


/** A payment went through (first charge or a renewal): the plan runs until periodEnd. { first } is true when
 *  this starts a new run of the plan (not a renewal), which is when the confirmation email goes out. */
export async function activate(db, { userId, plan, provider, providerRef = null, until, amount }) {
  if (!isPlan(plan)) throw new Error("activate: bad plan");
  const { data: prev, error: readError } = await db.from("subscriptions").select("status, current_period_end, started_at").eq("user_id", userId).maybeSingle();
  if (readError) throw new Error(`activate: ${readError.message}`);
  const first = !paidUp(prev);
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId, status: "active", plan, provider, provider_ref: providerRef,
    current_period_end: until || periodEnd(plan), cancel_at_period_end: false, canceled_at: null, updated_at: now,
    started_at: first ? now : prev.started_at || now, period_start: now,
    amount: amount == null || !Number.isFinite(Number(amount)) ? PLANS[plan].price : Number(amount),
    ...(first ? { refund_amount: null, refunded_at: null, refund_due: false } : {}),
  }, { onConflict: "user_id" });
  if (error) throw new Error(`activate: ${error.message}`);
  return { first };
}

/** Cancelled: no more charges; the plan keeps working until the end of the period already paid for. */
export async function markCanceled(db, userId) {
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").update({ status: "canceled", cancel_at_period_end: true, canceled_at: now, updated_at: now }).eq("user_id", userId);
  if (error) throw new Error(`cancel: ${error.message}`);
}

/** Cancelled by the person, with what cancelOutcome decided: premium runs until `until`; a refund was paid
 *  (`refunded`) or is owed by hand (`refundDue`). */
export async function endPlan(db, userId, { until, refund = 0, refunded = false, refundDue = false }) {
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").update({
    status: "canceled", cancel_at_period_end: true, canceled_at: now, updated_at: now, current_period_end: until,
    refund_amount: refund > 0 ? refund : null, refunded_at: refunded ? now : null, refund_due: Boolean(refundDue),
  }).eq("user_id", userId);
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
