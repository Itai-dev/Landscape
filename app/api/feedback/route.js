import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const err = (status, error) => NextResponse.json({ error }, { status });

// GET tells the form whether feedback can be saved here (no database configured → the form says so).
export async function GET() {
  return NextResponse.json({ ready: Boolean(adminClient()) }, { headers: { "cache-control": "no-store" } });
}

// POST {message, email?, page?} → {ok}. Written with the service role; browsers can't touch the table.
export async function POST(request) {
  const admin = adminClient();
  if (!admin) return err(503, "not_configured");
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allow(`feedback:${ip}`, { max: 5, windowMs: 10 * 60_000 }) || !allow("feedback:all", { max: 200, windowMs: 60 * 60_000 })) {
    return err(429, "rate_limited");
  }
  const body = await readJson(request, 8 * 1024);
  if (!body) return err(400, "bad_request");
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (message.length < 2) return err(400, "empty");
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  if (email && !EMAIL.test(email)) return err(400, "bad_email");
  const page = typeof body.page === "string" && body.page.startsWith("/") ? body.page.slice(0, 200) : null;
  const { error } = await admin.from("feedback").insert({ message, email: email || null, page });
  if (error) {
    console.error("feedback save failed", error.message);
    return err(500, "save_failed");
  }
  return NextResponse.json({ ok: true });
}
