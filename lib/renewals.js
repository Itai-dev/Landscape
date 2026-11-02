// The reminder 30 days before a yearly plan renews: when it renews, at what price, and how to cancel first.
// Once per period (renewal_notice_for holds the period end it was sent for); a failed send is retried the
// next day. Server only.
import { siteUrl } from "@/lib/digest";
import { renewalEmail } from "@/lib/premiumEmail";
import { notify } from "@/lib/billing/notify";

export const NOTICE_DAYS = 30;
const DAY = 864e5;

export async function runRenewalNotices(db, { now = new Date() } = {}) {
  const t = new Date(now).getTime();
  const { data, error } = await db.from("subscriptions")
    .select("user_id, plan, status, cancel_at_period_end, current_period_end, renewal_notice_for")
    .eq("plan", "yearly").eq("status", "active").eq("cancel_at_period_end", false)
    .gte("current_period_end", new Date(t).toISOString())
    .lte("current_period_end", new Date(t + NOTICE_DAYS * DAY).toISOString());
  if (error) throw new Error(`renewals: ${error.message}`);
  const due = (data || []).filter((r) => !r.renewal_notice_for || new Date(r.renewal_notice_for).getTime() !== new Date(r.current_period_end).getTime());
  let sent = 0, failed = 0;
  for (const r of due) {
    const out = await notify(db, { userId: r.user_id, key: `premium-renewal:${r.user_id}:${r.current_period_end}`,
      message: renewalEmail({ periodEnd: r.current_period_end, base: siteUrl() }) });
    if (!out.sent) { failed++; continue; }
    const { error: e } = await db.from("subscriptions").update({ renewal_notice_for: r.current_period_end }).eq("user_id", r.user_id);
    if (e) console.error("renewals: not marked", r.user_id, e.message);
    sent++;
  }
  return { due: due.length, sent, failed };
}
