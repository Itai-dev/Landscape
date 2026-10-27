// Cancelling a plan, the one way it's done (the cancel button, and deleting the account): stop the charges at
// the provider, pay back what cancelOutcome says is owed, record it. Server only.
import { cancelOutcome } from "@/lib/premium";
import { endPlan } from "@/lib/subscription";
import { provider } from "./index";

/** { ok, kind, refund, refunded, until, months } or { error: "provider_unavailable" | "provider_failed" }. */
export async function cancelPlan(db, userId, sub, now = new Date()) {
  const out = cancelOutcome(sub, now);
  const p = provider();
  const live = p && p.name === sub.provider ? p : null;
  // The test provider's plans exist only on previews and cost nothing: they cancel without a provider.
  if (!live && sub.provider !== "test") {
    console.error("cancel: provider not configured", sub.provider);
    return { error: "provider_unavailable" };
  }
  // Stop future charges first; only then record anything.
  if (live) {
    const res = await live.cancel({ ref: sub.provider_ref }).catch(() => ({ ok: false }));
    if (!res.ok) return { error: "provider_failed" };
  }
  let refunded = false;
  if (out.refund > 0) {
    if (!live) refunded = true;
    else {
      const res = await live.refund({ ref: sub.provider_ref, amount: out.refund }).catch(() => ({ ok: false }));
      refunded = Boolean(res.ok);
    }
    // The cancellation stands either way; a refund the provider refused is paid by hand, within 14 days.
    if (!refunded) console.error(`REFUND DUE: user ${userId}, ${out.refund} ILS, provider ${sub.provider}, ref ${sub.provider_ref}`);
  }
  await endPlan(db, userId, { until: out.until, refund: out.refund, refunded, refundDue: out.refund > 0 && !refunded });
  return { ok: true, ...out, refunded };
}
