// The payment provider, behind one small interface, so the rest of the site never names a provider.
// BILLING_PROVIDER picks it (server env). Each provider module exports:
//   ready()                                   → configured and allowed here?
//   checkout({ userId, email, plan, base, customer }) → { url } for a hosted payment page, or { url, activateNow } (test only)
//                                                customer: { firstName, lastName, phone, country } from the payment page
//   events({ raw, headers })                  → verified events from a webhook: [{ id, kind, userId, plan, ref, until, amount }]
//                                                kind: "paid" (first charge or renewal) | "canceled" | "failed" | "expired"
//   cancel({ ref })                           → stops future charges at the provider; { ok }
//   refund({ ref, amount })                   → pays `amount` shekels back to the card last charged; { ok }
// Israeli providers (Cardcom, PayPlus, Grow) get a module here once there's a merchant account; until then
// premium shows a waitlist instead of a payment button. Server only.
import { PREMIUM } from "@/lib/premium";
import * as test from "./test";
import { businessReady } from "@/lib/business";

const PROVIDERS = { test };

export function provider() {
  const name = (process.env.BILLING_PROVIDER || "").trim().toLowerCase();
  const mod = PROVIDERS[name];
  return mod && mod.ready() ? { name, ...mod } : null;
}

/** Can people pay right now? (premium switched on, a provider configured, the business details set) */
// Payments also stay closed until the business details the terms and receipts must show are set.
export const billingReady = () => Boolean(PREMIUM && provider() && businessReady());
