import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { verifyListToken } from "@/lib/mailer";

export const runtime = "nodejs";

// One-click "stop alerts" (RFC 8058 POST from mail clients) and the confirm button on /alerts/unsubscribe.
// The signed token is for the alerts list only, so it can't switch off the digest. No sign-in needed.
// Mail clients without one-click support open the URL with GET: show the confirm page.
export async function GET(request) {
  const url = new URL(request.url);
  const q = new URLSearchParams({ u: url.searchParams.get("u") || "", t: url.searchParams.get("t") || "" });
  return NextResponse.redirect(new URL(`/alerts/unsubscribe?${q}`, url.origin), 303);
}

export async function POST(request) {
  const url = new URL(request.url);
  let u = url.searchParams.get("u");
  let t = url.searchParams.get("t");
  if ((!u || !t) && (request.headers.get("content-type") || "").includes("form")) {
    const f = await request.formData();
    u = u || f.get("u");
    t = t || f.get("t");
  }
  const fromForm = url.searchParams.get("form") === "1";
  const back = (state) => NextResponse.redirect(new URL(`/alerts/unsubscribe?${state}`, url.origin), 303);
  if (!verifyListToken("alerts", u, t)) return fromForm ? back("error=link") : NextResponse.json({ error: "bad_token" }, { status: 400 });
  const db = adminClient();
  if (!db) return fromForm ? back("error=unavailable") : NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { error } = await db.from("newsletter_prefs").update({ alerts: "off" }).eq("user_id", u);
  if (error) {
    console.error("alerts unsubscribe failed", error.message);
    return fromForm ? back("error=unavailable") : NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return fromForm ? back("done=1") : NextResponse.json({ ok: true });
}
