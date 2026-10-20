import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/mailer";
import { runDigest } from "@/lib/digestSend";
import { refreshSnapshot } from "@/lib/survey/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (vercel.json) calls this every morning with "Authorization: Bearer $CRON_SECRET".
// On Sunday it sends the week's edition; the next two days catch up on anyone not sent yet.
// It also refreshes the survey results snapshot (at most once a day, only after enough new answers).
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "supabase_not_configured" });
  const out = {};
  try {
    out.digest = await runDigest(db, { limit: Number(process.env.DIGEST_DAILY_LIMIT) || 90 });
  } catch (e) {
    console.error("digest cron failed", e.message);
    out.digest = { error: "failed" };
  }
  try {
    out.survey = await refreshSnapshot(db);
  } catch (e) {
    console.error("survey snapshot failed", e.message);
    out.survey = { error: "failed" };
  }
  console.log("daily cron", JSON.stringify(out));
  return NextResponse.json(out, { status: out.digest?.error ? 500 : 200 });
}
