import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { savePrefs, activeConsent } from "@/lib/consent";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
const err = (status, error) => NextResponse.json({ error }, { status });

// The signed-in reader's digest choices (read with their own session; RLS lets them see only their row).
export async function GET() {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  const { data } = await sb.from("newsletter_prefs").select("frequency, crafts, topics, consent_at, unsubscribed_at").eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ email: user.email, prefs: { frequency: "off", crafts: [], topics: [], consent_at: null } });
  // After an unsubscribe the old consent no longer counts: the settings page asks for it again.
  const { unsubscribed_at, ...prefs } = data;
  return NextResponse.json({ email: user.email, prefs: { ...prefs, crafts: prefs.crafts || [], consent_at: activeConsent(data) ? data.consent_at : null } });
}

// POST { frequency, crafts, consent }: saved by the server (service role). Turning the digest on needs
// explicit consent once (anti-spam law §30A); the address is the account's own.
export async function POST(request) {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`prefs:${user.id}`, { max: 20, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  const res = await savePrefs(adminClient(), user, { frequency: body.frequency, crafts: body.crafts, consent: body.consent === true });
  if (!res.ok) return err(res.error === "save_failed" ? 500 : res.error === "not_configured" ? 503 : 400, res.error);
  return NextResponse.json({ ok: true, ...res.prefs });
}
