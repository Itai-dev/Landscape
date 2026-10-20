import { NextResponse } from "next/server";
import { serverClient, currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// For the companies app (a static page): is someone signed in, and is sign-up open? Nothing else about the user.
export async function GET() {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  return NextResponse.json({ signup: Boolean(sb), signedIn: Boolean(user) }, { headers: { "cache-control": "private, no-store" } });
}
