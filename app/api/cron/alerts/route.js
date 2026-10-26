import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/mailer";
import { runAlerts } from "@/lib/alertsSend";
import { PREMIUM } from "@/lib/premium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (vercel.json) calls this every morning with "Authorization: Bearer $CRON_SECRET".
// It sends one email per person with the new updates on the companies they follow.
// ?only=instant is the hourly run for premium "instant" alerts (.github/workflows/instant-alerts.yml), since
// Vercel's free plan runs scheduled jobs once a day.
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const only = new URL(request.url).searchParams.get("only") === "instant" ? "instant" : undefined;
  if (only && !PREMIUM) return NextResponse.json({ skipped: "premium_off" });
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "supabase_not_configured" });
  try {
    const out = await runAlerts(db, { limit: Number(process.env.ALERTS_DAILY_LIMIT) || 40, only });
    console.log("alerts cron", JSON.stringify(out));
    return NextResponse.json(out);
  } catch (e) {
    console.error("alerts cron failed", e.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
