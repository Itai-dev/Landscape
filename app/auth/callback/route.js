import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

// Magic-link landing: exchange the code for a session, then continue to `next` (same-site paths only).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || "/onboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboard";
  const sb = await serverClient();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
