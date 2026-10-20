import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function POST(request) {
  const sb = await serverClient();
  if (sb) await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
