import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { isOpen } from "@/lib/survey/config";
import { cleanAnswers } from "@/lib/survey/validate";
import { myState, saveResponse } from "@/lib/survey/server";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (status, error, extra = {}) => NextResponse.json({ error, ...extra }, { status });

// GET: the signed-in person's own answers, invite code and invite count (as of the latest results).
export async function GET() {
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return NextResponse.json({ signedIn: false, open: isOpen() });
  const state = await myState(sb, adminClient(), user);
  return NextResponse.json({ signedIn: true, open: isOpen(), userId: user.id, ...state }, { headers: { "cache-control": "no-store" } });
}

// POST {answers, complete}: save a draft (complete=false) or the final answers (complete=true).
// Answers are cleaned here and written with the service role; people can't write the table directly.
export async function POST(request) {
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return err(401, "sign_in");
  if (!isOpen()) return err(403, "closed");
  if (!allow(`survey:${user.id}`, { max: 60, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const admin = adminClient();
  if (!admin) return err(503, "not_configured");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  const { answers, missing } = cleanAnswers(body.answers);
  const complete = body.complete === true;
  if (complete && missing.length) return err(400, "missing", { missing });
  const res = await saveResponse(admin, user, { answers, complete });
  if (!res.ok) return err(500, "save_failed");
  return NextResponse.json({ ok: true, completed: res.completed, kept: res.kept || undefined, missing });
}
