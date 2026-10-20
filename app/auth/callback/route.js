import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase/server";
import { savePrefs, cleanFrequency, cleanCraftList } from "@/lib/consent";
import { recordReferral, CODE_RE } from "@/lib/survey/server";

// Magic-link landing: exchange the code for a session, then continue to `next` (same-site paths only).
// Opening the link confirms the address, so this is where choices made on a sign-up form take effect:
//   ?subscribe=weekly|biweekly|monthly&crafts=a,b  — the digest opt-in ticked on the form (double opt-in)
//   ?ref=CODE                                      — an invite link, credited only to a brand-new account
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || "/onboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboard";
  const sb = await serverClient();
  if (sb && code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.user || data?.session?.user || null;
      const admin = adminClient();
      const subscribe = cleanFrequency(searchParams.get("subscribe"));
      if (user && admin && subscribe && subscribe !== "off") {
        await savePrefs(admin, user, { frequency: subscribe, crafts: cleanCraftList(searchParams.get("crafts")), consent: true }).catch((e) => console.error("subscribe on confirm failed", e?.message));
      }
      const ref = String(searchParams.get("ref") || "").toLowerCase();
      if (user && admin && CODE_RE.test(ref)) await recordReferral(admin, user, ref).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
