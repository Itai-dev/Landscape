import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";
import { saveCrafts, cleanCraftList } from "@/lib/consent";
import { suggestCompanies } from "@/lib/welcome";

export const runtime = "nodejs";
const err = (status, error) => NextResponse.json({ error }, { status });

// POST { crafts }: the welcome flow's craft step, for someone who signed up without choosing crafts (e.g. with
// Google from the sign-in page). Saves them (never touches the newsletter's frequency or consent) and returns
// companies to suggest following.
export async function POST(request) {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`welcome:${user.id}`, { max: 20, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  const crafts = cleanCraftList(body.crafts);
  if (crafts.length) await saveCrafts(adminClient(), user, crafts);
  return NextResponse.json({ ok: true, crafts, suggestions: suggestCompanies(crafts) });
}
