import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { SURVEY_ID, isOpen } from "@/lib/survey/config";
import { cleanAnswers } from "@/lib/survey/validate";
import { myState, clearAggregateCache } from "@/lib/survey/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status, error, extra = {}) => NextResponse.json({ error, ...extra }, { status });

// GET: the signed-in person's own answers, invite code and invite count.
export async function GET() {
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return NextResponse.json({ signedIn: false, open: isOpen() });
  const state = await myState(sb, adminClient(), user);
  return NextResponse.json({ signedIn: true, open: isOpen(), ...state }, { headers: { "cache-control": "no-store" } });
}

// POST {answers, complete}: save a draft (complete=false) or the final answers (complete=true).
export async function POST(request) {
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return err(401, "sign_in");
  if (!isOpen()) return err(403, "closed");
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return err(400, "bad_json");
  const { answers, missing } = cleanAnswers(body.answers);
  const complete = body.complete === true;
  if (complete && missing.length) return err(400, "missing", { missing });

  const { data: existing } = await sb.from("survey_responses").select("completed")
    .eq("user_id", user.id).eq("survey_id", SURVEY_ID).maybeSingle();
  // A draft never un-completes a finished response; changing a finished one means submitting it again in full.
  if (!complete && existing?.completed) return NextResponse.json({ ok: true, completed: true, kept: true });

  const row = { user_id: user.id, survey_id: SURVEY_ID, answers, completed: complete, updated_at: new Date().toISOString() };
  const { error } = await sb.from("survey_responses").upsert(row, { onConflict: "user_id,survey_id" });
  if (error) {
    console.error("survey save failed", error.message);
    return err(500, "save_failed");
  }
  if (complete) clearAggregateCache();
  return NextResponse.json({ ok: true, completed: complete, missing });
}
