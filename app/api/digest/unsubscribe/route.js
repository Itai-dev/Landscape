import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { verifyUnsubscribe } from "@/lib/mailer";

export const runtime = "nodejs";

// One-click unsubscribe (RFC 8058: mail clients POST "List-Unsubscribe=One-Click" to this URL),
// and the confirm button on /digest/unsubscribe. The signed token identifies the reader; no sign-in needed.
// Mail clients without one-click support open the List-Unsubscribe URL with GET: show the confirm page.
export async function GET(request) {
  const url = new URL(request.url);
  const q = new URLSearchParams({ u: url.searchParams.get("u") || "", t: url.searchParams.get("t") || "" });
  return NextResponse.redirect(new URL(`/digest/unsubscribe?${q}`, url.origin), 303);
}

export async function POST(request) {
  const url = new URL(request.url);
  let u = url.searchParams.get("u");
  let t = url.searchParams.get("t");
  const type = request.headers.get("content-type") || "";
  if ((!u || !t) && type.includes("form")) {
    const f = await request.formData();
    u = u || f.get("u");
    t = t || f.get("t");
  }
  const fromForm = url.searchParams.get("form") === "1";
  const back = (state) => NextResponse.redirect(new URL(`/digest/unsubscribe?${state}`, url.origin), 303);
  if (!verifyUnsubscribe(u, t)) return fromForm ? back("error=link") : NextResponse.json({ error: "bad_token" }, { status: 400 });
  const db = adminClient();
  if (!db) return fromForm ? back("error=unavailable") : NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { error } = await db.from("newsletter_prefs")
    .update({ frequency: "off", unsubscribed_at: new Date().toISOString() })
    .eq("user_id", u);
  if (error) {
    console.error("unsubscribe failed", error.message);
    return fromForm ? back("error=unavailable") : NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return fromForm ? back("done=1") : NextResponse.json({ ok: true });
}
