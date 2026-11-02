import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { applySignupChoices, safeNext } from "@/lib/afterSignIn";

const HOME = PROFILES_ENABLED ? "/onboard" : "/digest/settings";

// Sign-in landing (magic link, Google/Apple redirect): verify, then continue to `next` (same-site paths only).
// Opening the link confirms the address, so this is where choices made on a sign-up form take effect
// (lib/afterSignIn.js lists them). Two kinds of email link land here:
//   ?token_hash=…&type=email — the email templates' link (docs/supabase-email-templates.md). Verified on the
//     server, so it works in whatever browser opens it (a mail app's own browser, another phone).
//   ?code=… — Supabase's default PKCE link (and the OAuth redirect); it only works in the browser that asked for it.
// A link that fails lands on /me with a message and a sign-in form, never silently on the home page.
const OTP_TYPES = new Set(["email", "magiclink", "signup", "recovery"]);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = OTP_TYPES.has(searchParams.get("type")) ? searchParams.get("type") : "email";
  const next = safeNext(searchParams.get("next") || HOME, HOME);
  const sb = await serverClient();
  if (sb && (code || tokenHash)) {
    const { data, error } = tokenHash
      ? await sb.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.user || data?.session?.user || null;
      await applySignupChoices(adminClient(), user, searchParams);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/me?auth_error=1`);
}
