import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase/server";
import { savePrefs, cleanFrequency, cleanCraftList } from "@/lib/consent";
import { recordReferral, CODE_RE } from "@/lib/survey/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { isOrgId, addFollows, alertPrefs, setAlerts } from "@/lib/follows";

const HOME = PROFILES_ENABLED ? "/onboard" : "/digest/settings";

// Magic-link landing: exchange the code for a session, then continue to `next` (same-site paths only).
// Opening the link confirms the address, so this is where choices made on a sign-up form take effect:
//   ?subscribe=weekly|biweekly|monthly&crafts=a,b  — the digest opt-in ticked on the form (double opt-in)
//   ?ref=CODE                                      — an invite link, credited only to a brand-new account
//   ?follow=ORG_ID&alerts=daily                    — a company followed signed out, with the alerts opt-in
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || HOME;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : HOME;
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
      // A follow started signed out (/api/follows/start): record it, and the alerts opt-in ticked with it.
      const follow = searchParams.get("follow");
      if (user && admin && isOrgId(follow)) {
        await addFollows(admin, user.id, [follow]).catch((e) => console.error("follow on confirm failed", e?.message));
        if (searchParams.get("alerts") === "daily") {
          const cur = await alertPrefs(admin, user.id).catch(() => null);
          // Someone who switched alerts off earlier keeps them off; following again doesn't override that.
          if (cur && !cur.consent) await setAlerts(admin, user, { mode: "daily", consent: true }).catch((e) => console.error("alerts on confirm failed", e?.message));
        }
      }
      const ref = String(searchParams.get("ref") || "").toLowerCase();
      if (user && admin && CODE_RE.test(ref)) await recordReferral(admin, user, ref).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
