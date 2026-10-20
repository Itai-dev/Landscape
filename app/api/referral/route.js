import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { recordReferral, CODE_RE } from "@/lib/survey/server";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";

// POST {code}: the signed-in person arrived through someone's invite link (?ref=CODE).
// Credited only for a confirmed, brand-new account (see recordReferral); normally /auth/callback does it.
export async function POST(request) {
  const sb = await serverClient();
  if (!sb) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const user = await currentUser(sb);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  if (!allow(`ref:${user.id}`, { max: 10, windowMs: 10 * 60_000 })) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = await readJson(request, 1024);
  const code = String(body?.code || "").toLowerCase();
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "bad_code" }, { status: 400 });
  const ok = await recordReferral(adminClient(), user, code);
  return NextResponse.json({ ok });
}
