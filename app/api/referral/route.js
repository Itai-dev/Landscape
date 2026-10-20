import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { recordReferral, CODE_RE } from "@/lib/survey/server";

export const runtime = "nodejs";

// POST {code}: the signed-in person arrived through someone's invite link (?ref=CODE).
export async function POST(request) {
  const sb = await serverClient();
  if (!sb) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const user = await currentUser(sb);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = String(body?.code || "").toLowerCase();
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "bad_code" }, { status: 400 });
  const ok = await recordReferral(adminClient(), user, code);
  return NextResponse.json({ ok });
}
