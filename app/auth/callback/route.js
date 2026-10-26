import { NextResponse } from "next/server";
import { serverClient, adminClient } from "@/lib/supabase/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { applySignupChoices, safeNext } from "@/lib/afterSignIn";

const HOME = PROFILES_ENABLED ? "/onboard" : "/digest/settings";

// Magic-link (and Google/Apple redirect) landing: exchange the code for a session, then continue to `next`
// (same-site paths only). Opening the link confirms the address, so this is where choices made on a sign-up
// form take effect (lib/afterSignIn.js lists them).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next") || HOME, HOME);
  const sb = await serverClient();
  if (sb && code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.user || data?.session?.user || null;
      await applySignupChoices(adminClient(), user, searchParams);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
