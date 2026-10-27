import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/mailer";
import { runAlerts } from "@/lib/alertsSend";
import { PREMIUM } from "@/lib/premium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (vercel.json) calls this every hour with "Authorization: Bearer $CRON_SECRET": premium accounts
// that chose instant alerts get updates on their companies within the hour of them going live.
// The daily run (/api/cron/alerts) still covers everyone else. While premium is off it does nothing.
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!PREMIUM) return NextResponse.json({ skipped: "premium_off" });
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "supabase_not_configured" });
  try {
    const out = await runAlerts(db, { limit: Number(process.env.ALERTS_DAILY_LIMIT) || 40, only: "instant" });
    console.log("instant alerts cron", JSON.stringify(out));
    return NextResponse.json(out);
  } catch (e) {
    console.error("instant alerts cron failed", e.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
