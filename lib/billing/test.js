// A stand-in provider for preview deploys and local checks: "paying" activates the plan at once, with no card
// and no charge. It refuses to run in production. Its webhook takes JSON signed with BILLING_WEBHOOK_SECRET
// (HMAC-SHA256 of the raw body, hex, in "x-billing-signature"), which is how scripts/test-premium.mjs drives it.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { periodEnd } from "@/lib/subscription";

export const ready = () => process.env.BILLING_PROVIDER === "test" && process.env.VERCEL_ENV !== "production";

export async function checkout({ plan }) {
  const ref = `test_${randomUUID()}`;
  return { url: "/premium/thanks?test=1", activateNow: { plan, ref, until: periodEnd(plan) } };
}

export function sign(raw, secret = process.env.BILLING_WEBHOOK_SECRET || "") {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function events({ raw, headers }) {
  const secret = process.env.BILLING_WEBHOOK_SECRET || "";
  const got = String(headers.get("x-billing-signature") || "");
  const want = sign(raw, secret);
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return null;
  let body;
  try { body = JSON.parse(raw); } catch { return null; }
  return (Array.isArray(body.events) ? body.events : [body]).map((e) => ({
    id: String(e.id || ""), kind: e.kind, userId: e.userId, plan: e.plan, ref: e.ref || null, until: e.until || null, amount: e.amount ?? null,
  }));
}

export async function cancel() {
  return { ok: true };
}

export async function refund() {
  return { ok: true };
}
