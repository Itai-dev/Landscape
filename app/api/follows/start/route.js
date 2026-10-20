import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { isOrgId } from "@/lib/follows";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
const err = (status, error) => NextResponse.json({ error }, { status });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

// Signed out: { email, org_id, consent: true } sends a sign-in link. Nothing is stored now; the follow and
// the alerts opt-in are recorded in /auth/callback, i.e. only once the address is confirmed (double opt-in).
// Works for both the Next pages and the companies app (a static page without its own Supabase client).
export async function POST(request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allow(`follow-start:${ip}`, { max: 5, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const body = await readJson(request, 4 * 1024);
  if (!body) return err(400, "bad_json");
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return err(400, "bad_email");
  if (!isOrgId(body.org_id)) return err(400, "bad_org");
  if (body.consent !== true) return err(400, "consent_required");
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const origin = new URL(request.url).origin;
  const q = new URLSearchParams({ next: `/me?followed=${body.org_id}#follows`, follow: body.org_id, alerts: "daily" });
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?${q}` } });
  if (error) return err(/rate|limit/i.test(error.message) ? 429 : 400, /rate|limit/i.test(error.message) ? "rate_limited" : "send_failed");
  return NextResponse.json({ ok: true });
}
