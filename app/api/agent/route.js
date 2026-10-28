// The agent (/agent): reads a one-line intro, then composes the reader's briefing. Rules over site/data, no AI
// call per person and nothing stored; the profile lives in the reader's browser.
import { NextResponse } from "next/server";
import { readJson, allow } from "@/lib/guard";
import { readIntro, composeBrief, siteOnMap, onMap, readSiteText, clientCards } from "@/lib/agent";
import { fetchPageText } from "@/lib/fetchPage";

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`agent:${ip}`, { max: 40, windowMs: 60_000 })) return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב בעוד דקה." }, { status: 429 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (body.action === "read") return NextResponse.json(readIntro(String(body.text || "").slice(0, 300)));
  // A site or portfolio link: on the map already → what the map knows; else the page is read (public pages only,
  // lib/fetchPage.js guards) for the role, crafts and the brands it names. Nothing is stored.
  if (body.action === "site") {
    if (!allow(`agent-site:${ip}`, { max: 8, windowMs: 60_000 })) return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב בעוד דקה." }, { status: 429 });
    const url = String(body.url || "").trim().slice(0, 300);
    const id = siteOnMap(url);
    if (id) { const m = onMap(id); return NextResponse.json({ ok: true, found: { id: m.id, name: m.name }, role: m.role, crafts: m.crafts, clients: clientCards(m.clients) }); }
    try {
      const page = await fetchPageText(url);
      if (!page.text || page.text.length < 80) return NextResponse.json({ ok: false, note: page.note || "short" });
      const r = readSiteText(page.text);
      return NextResponse.json({ ok: true, found: null, role: r.role, crafts: r.crafts, clients: clientCards(r.clients) });
    } catch {
      return NextResponse.json({ ok: false, note: "fetch" });
    }
  }
  if (body.action === "brief") {
    const list = (v, n) => (Array.isArray(v) ? v.map(String).slice(0, n) : []);
    return NextResponse.json(composeBrief({ role: String(body.role || ""), crafts: list(body.crafts, 12), goals: list(body.goals, 6), follows: list(body.follows, 100), clients: list(body.clients, 20), self: String(body.self || "") }));
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
