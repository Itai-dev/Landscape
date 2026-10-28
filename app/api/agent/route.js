// The agent (/agent): reads a one-line intro, then composes the reader's briefing. Rules over site/data, no AI
// call per person and nothing stored; the profile lives in the reader's browser.
import { NextResponse } from "next/server";
import { readJson, allow } from "@/lib/guard";
import { readIntro, composeBrief } from "@/lib/agent";

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`agent:${ip}`, { max: 40, windowMs: 60_000 })) return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב בעוד דקה." }, { status: 429 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (body.action === "read") return NextResponse.json(readIntro(String(body.text || "").slice(0, 300)));
  if (body.action === "brief") {
    const list = (v, n) => (Array.isArray(v) ? v.map(String).slice(0, n) : []);
    return NextResponse.json(composeBrief({ role: String(body.role || ""), crafts: list(body.crafts, 12), goals: list(body.goals, 6), follows: list(body.follows, 100) }));
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
