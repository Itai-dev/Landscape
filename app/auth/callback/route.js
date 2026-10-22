import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase/server";
import { savePrefs, saveCrafts, cleanFrequency, cleanCraftList } from "@/lib/consent";
import { recordReferral, CODE_RE } from "@/lib/survey/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { isOrgId, addFollows, alertPrefs, setAlerts } from "@/lib/follows";

const HOME = PROFILES_ENABLED ? "/onboard" : "/digest/settings";

// Magic-link landing: exchange the code for a session, then continue to `next` (same-site paths only).
// Opening the link confirms the address, so this is where choices made on a sign-up form take effect:
//   ?subscribe=weekly|biweekly|monthly&crafts=a,b  — the digest opt-in ticked on the form (double opt-in)
//   ?crafts=a,b (no subscribe)                     — an account without the newsletter: the crafts only
//   ?ref=CODE                                      — an invite link, credited only to a brand-new account
//   ?follow=ORG_ID&alerts=daily                    — a company followed signed out, with the alerts opt-in
// Two kinds of link land here:
//   ?token_hash=…&type=email — the email templates' link (docs/supabase-email-templates.md). Verified on the
//     server, so it works in whatever browser opens it (a mail app's own browser, another phone).
//   ?code=… — Supabase's default PKCE link; it only works in the browser that asked for it.
// A link that fails lands on /me with a message and a sign-in form, never silently on the home page.
const OTP_TYPES = new Set(["email", "magiclink", "signup"]);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = OTP_TYPES.has(searchParams.get("type")) ? searchParams.get("type") : "email";
  const nextParam = searchParams.get("next") || HOME;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : HOME;
  const sb = await serverClient();
  if (sb && (code || tokenHash)) {
    const { data, error } = tokenHash
      ? await sb.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.user || data?.session?.user || null;
      const admin = adminClient();
      const subscribe = cleanFrequency(searchParams.get("subscribe"));
      if (user && admin && subscribe && subscribe !== "off") {
        await savePrefs(admin, user, { frequency: subscribe, crafts: cleanCraftList(searchParams.get("crafts")), consent: true }).catch((e) => console.error("subscribe on confirm failed", e?.message));
      } else if (user && admin && searchParams.get("crafts")) {
        // An account without the newsletter: keep the crafts chosen at sign-up (nothing is sent).
        await saveCrafts(admin, user, searchParams.get("crafts")).catch((e) => console.error("crafts on confirm failed", e?.message));
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
  return NextResponse.redirect(`${origin}/me?auth_error=1`);
}
