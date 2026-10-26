import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { applySignupChoices } from "@/lib/afterSignIn";

export const runtime = "nodejs";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST { q }: right after a sign-in that happened on the page (Google's button), apply what the sign-up form
// asked for. `q` is the same query a magic link would carry (crafts, subscribe, follow, ref); the address is
// already confirmed by Google, so it takes effect now, for the signed-in account only.
export async function POST(request) {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`after:${user.id}`, { max: 10, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const body = await readJson(request);
  if (!body || typeof body.q !== "string" || body.q.length > 2000) return err(400, "bad_json");
  await applySignupChoices(adminClient(), user, new URLSearchParams(body.q));
  return NextResponse.json({ ok: true });
}
