import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { PREMIUM } from "@/lib/premium";
import { provider } from "@/lib/billing";
import { getSubscription, isActive, markCanceled } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST {} → cancels the person's subscription online, in one step (consumer protection law: cancelling an
// ongoing deal must be as easy as joining). No more charges; premium keeps working until the paid period ends.
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
  const p = provider();
  // Stop the charges at the provider first; only then record the cancellation.
  if (p && p.name === sub.provider) {
    const res = await p.cancel({ ref: sub.provider_ref }).catch(() => ({ ok: false }));
    if (!res.ok) return err(502, "provider_failed");
  } else if (sub.provider !== "test") {
    console.error("cancel: provider not configured", sub.provider);
    return err(503, "provider_unavailable");
  }
  await markCanceled(db, user.id);
  return NextResponse.json({ ok: true, until: sub.current_period_end });
}
