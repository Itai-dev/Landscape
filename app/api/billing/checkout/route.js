import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { PREMIUM, isPlan, TERMS_VERSION } from "@/lib/premium";
import { provider } from "@/lib/billing";
import { applyEvents } from "@/lib/billing/apply";
import { planOf } from "@/lib/subscription";
import { siteUrl } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST { plan: "monthly" | "yearly", agree: true } → { url }: the provider's hosted payment page for this person.
// The plan is switched on only by the provider's webhook once the charge goes through (the test provider,
// on preview deploys only, switches it on here, with no charge).
export async function POST(request) {
  if (!PREMIUM) return err(404, "not_found");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  if (!isPlan(body.plan)) return err(400, "bad_plan");
  // The consent box: terms read, 18 or over, renews until cancelled. Recorded before the payment page opens.
  if (body.agree !== true) return err(400, "terms_required");
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`checkout:${user.id}`, { max: 10, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const p = provider();
  if (!p) return err(503, "billing_not_ready");
  const db = adminClient();
  if (!db) return err(503, "not_configured");
  if ((await planOf(db, user.id)).premium) return err(409, "already_premium");
  const { error: termsError } = await db.from("terms_acceptances").insert({ user_id: user.id, version: TERMS_VERSION, context: "checkout", plan: body.plan });
  if (termsError) {
    console.error("checkout: terms not recorded", termsError.message);
    return err(503, "not_configured");
  }
  try {
    const out = await p.checkout({ userId: user.id, email: user.email || "", plan: body.plan, base: siteUrl() });
    if (out.activateNow) {
      await applyEvents(db, p.name, [{ id: `checkout-${randomUUID()}`, kind: "paid", userId: user.id, plan: out.activateNow.plan, ref: out.activateNow.ref, until: out.activateNow.until }]);
    }
    return NextResponse.json({ url: out.url });
  } catch (e) {
    console.error("checkout failed", e.message);
    return err(502, "checkout_failed");
  }
}
