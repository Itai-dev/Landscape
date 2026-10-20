import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/mailer";
import { runDigest } from "@/lib/digestSend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (vercel.json) calls this every morning with "Authorization: Bearer $CRON_SECRET".
// On Sunday it sends the week's edition; the next two days catch up on anyone not sent yet.
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "supabase_not_configured" });
  try {
    const result = await runDigest(db, { limit: Number(process.env.DIGEST_DAILY_LIMIT) || 90 });
    console.log("digest cron", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    console.error("digest cron failed", e.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
