import { NextResponse } from "next/server";
import { aiReady } from "@/lib/config";
import { askDirectory } from "@/lib/ask";

export const runtime = "nodejs";
export const maxDuration = 60;

// Simple abuse protection, per server instance: a few questions per visitor, and a ceiling for everyone.
const PER_IP = { max: 6, windowMs: 10 * 60_000 };
const GLOBAL = { max: 120, windowMs: 60 * 60_000 };
const hits = new Map();
let global = [];
function allowed(ip) {
  const now = Date.now();
  global = global.filter((t) => now - t < GLOBAL.windowMs);
  const mine = (hits.get(ip) || []).filter((t) => now - t < PER_IP.windowMs);
  if (mine.length >= PER_IP.max || global.length >= GLOBAL.max) return false;
  mine.push(now);
  global.push(now);
  hits.set(ip, mine);
  if (hits.size > 5000) hits.clear();
  return true;
}

// GET tells the companies app whether to show the "Ask AI" tab at all.
export async function GET() {
  return NextResponse.json({ ready: aiReady() }, { headers: { "cache-control": "no-store" } });
}

// POST {q, lang?, crafts?} → {summary, results: [{id, why}], followups}
export async function POST(request) {
  if (!aiReady()) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 400) : "";
  if (q.length < 2) return NextResponse.json({ error: "empty" }, { status: 400 });
  const crafts = Array.isArray(body.crafts) ? body.crafts.filter((c) => typeof c === "string").slice(0, 10) : [];
  try {
    const answer = await askDirectory({ q, lang: body.lang === "en" ? "en" : "he", crafts });
    return NextResponse.json(answer);
  } catch (e) {
    console.error("ask failed", e?.status || "", e?.message);
    const code = e?.code === "refused" ? "refused" : e?.code === "timeout" ? "timeout" : e?.status === 429 ? "rate_limited" : "ai_failed";
    return NextResponse.json({ error: code }, { status: code === "rate_limited" ? 429 : 502 });
  }
}
