import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/mailer";
import { PREMIUM } from "@/lib/premium";
import { runRenewalNotices } from "@/lib/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (vercel.json), daily: emails yearly subscribers 30 days before their plan renews.
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!PREMIUM) return NextResponse.json({ skipped: "premium_off" });
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "supabase_not_configured" });
  try {
    const out = await runRenewalNotices(db);
    console.log("renewals cron", JSON.stringify(out));
    return NextResponse.json(out);
  } catch (e) {
    console.error("renewals cron failed", e.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
