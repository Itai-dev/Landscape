import { NextResponse } from "next/server";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { CRAFT_SLUGS, CONSENT_TEXT } from "@/lib/taxonomy";

export const runtime = "nodejs";
const FREQS = ["weekly", "biweekly", "monthly", "off"];
const err = (status, error) => NextResponse.json({ error }, { status });

// The signed-in reader's digest choices.
export async function GET() {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  const { data } = await sb.from("newsletter_prefs").select("frequency, crafts, topics, consent_at").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ email: user.email, prefs: data || { frequency: "off", crafts: [], topics: [], consent_at: null } });
}

// POST { frequency, crafts, consent } — turning the digest on needs explicit consent once (anti-spam law §30A).
export async function POST(request) {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  const body = await request.json().catch(() => ({}));
  const frequency = FREQS.includes(body.frequency) ? body.frequency : "off";
  const crafts = [...new Set((Array.isArray(body.crafts) ? body.crafts : []).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 12);
  const { data: cur } = await sb.from("newsletter_prefs").select("consent_at").eq("user_id", user.id).maybeSingle();
  if (frequency !== "off" && !cur?.consent_at && body.consent !== true) return err(400, "consent_required");
  const row = {
    user_id: user.id,
    email: user.email || "",
    frequency,
    crafts,
    unsubscribed_at: frequency === "off" ? new Date().toISOString() : null,
    ...(frequency !== "off" && !cur?.consent_at ? { consent_at: new Date().toISOString(), consent_text: CONSENT_TEXT } : {}),
  };
  const { error } = await sb.from("newsletter_prefs").upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("digest prefs save failed", error.message);
    return err(500, "save_failed");
  }
  return NextResponse.json({ ok: true, frequency, crafts });
}
