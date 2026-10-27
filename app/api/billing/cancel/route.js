import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { PREMIUM } from "@/lib/premium";
import { getSubscription, isActive } from "@/lib/subscription";
import { cancelPlan } from "@/lib/billing/cancel";
import { notify } from "@/lib/billing/notify";
import { cancellationEmail } from "@/lib/premiumEmail";
import { siteUrl } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST {} → cancels the person's subscription online, in one step and with no fee (consumer protection law:
// cancelling an ongoing deal must be as easy as joining). Within 14 days of joining the whole payment comes
// back; a yearly plan after that gets back the months not yet started (lib/premium.js cancelOutcome).
export async function POST(request) {
  if (!PREMIUM) return err(404, "not_found");
  if (!(await readJson(request))) return err(400, "bad_json");
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`cancel:${user.id}`, { max: 10, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const db = adminClient();
  if (!db) return err(503, "not_configured");
  const sub = await getSubscription(db, user.id);
  if (!sub || !isActive(sub) || sub.status === "canceled") return err(400, "no_active_plan");
  const out = await cancelPlan(db, user.id, sub);
  if (out.error) return err(out.error === "provider_failed" ? 502 : 503, out.error);
  await notify(db, { userId: user.id, email: user.email || "", key: `premium-cancel:${user.id}:${sub.started_at || ""}`,
    message: cancellationEmail({ outcome: out, plan: sub.plan, base: siteUrl() }) });
  return NextResponse.json({ ok: true, kind: out.kind, refund: out.refund, until: out.until, months: out.months });
}
