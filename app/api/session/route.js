import { NextResponse } from "next/server";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { ME, ctaInner, tabCtaInner } from "@/lib/chrome.mjs";

export const dynamic = "force-dynamic";

// For the companies app (a static page): is someone signed in, and is sign-up open? Nothing else about the user.
// `me` is the header call to action for signed-in people, so both apps show the same button.
export async function GET() {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  return NextResponse.json(
    {
      signup: Boolean(sb),
      signedIn: Boolean(user),
      profiles: PROFILES_ENABLED,
      ...(user ? { me: { href: ME.href, label: ME.label, html: ctaInner(ME), bar: tabCtaInner(ME) } } : {}),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
