import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { PREMIUM, isPlan } from "@/lib/premium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST { plan? } → records that this person wants premium, while payments aren't open yet. Signed in only.
export async function POST(request) {
  if (!PREMIUM) return err(404, "not_found");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`waitlist:${user.id}`, { max: 10, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const db = adminClient();
  if (!db) return err(503, "not_configured");
  const { error } = await db.from("premium_waitlist").upsert({ user_id: user.id, plan: isPlan(body.plan) ? body.plan : null }, { onConflict: "user_id" });
  if (error) { console.error("waitlist save failed", error.message); return err(500, "save_failed"); }
  return NextResponse.json({ ok: true });
}
