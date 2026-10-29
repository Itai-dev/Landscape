// The agent (/agent): reading a one-line intro, and the briefing it composes. node scripts/test-agent.mjs
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { readIntro, composeBrief, siteOnMap, onMap, readSiteText, answer } = await import("../lib/agent.js");

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log(`✗ ${msg}`); } };
const intro = [
  ["סטודיו למושן ומיתוג בתל אביב", "studio", ["motion-design", "branding"]],
  ["פרילנסרית, עושה איור ועיצוב גרפי", "freelance", ["illustration", "graphic-design"]],
  ["מנהלת שיווק במותג אופנה", "brand", []],
  ["חברת הפקה לפרסומות ותוכן", "studio", ["commercial-production", "content-studio"]],
  ["קופירייטר עצמאי", "freelance", ["copywriting"]],
];
for (const [text, role, crafts] of intro) {
  const r = readIntro(text);
  ok(r.role === role, `"${text}": role ${r.role}, expected ${role}`);
  for (const c of crafts) ok(r.crafts.includes(c), `"${text}": missing ${c} (got ${r.crafts.join(", ")})`);
}

// A site link: a company already on the map is recognised by its address; any other page is read for brands it names.
ok(siteOnMap("https://www.ankanimation.com/he") === "anka-studio", "a site on the map is recognised (with www and a path)");
ok(siteOnMap("ankanimation.com") === "anka-studio", "a bare address is recognised");
ok(siteOnMap("https://example.org") === null, "an unknown site is not on the map");
const anka = onMap("anka-studio");
ok(anka.role === "studio" && anka.crafts.length > 0, "what the map knows: role and crafts");
const site = readSiteText("Motion and branding studio in Tel Aviv. Selected clients: Isracard, Strauss, El Al. כאן תמצאו את העבודות שלנו");
ok(site.role === "studio" && site.crafts.includes("motion-design") && site.crafts.includes("branding"), `a page: role and crafts (${site.role}, ${site.crafts})`);
ok(site.clients.includes("isracard"), `a page: brands it names (${site.clients})`);
ok(!site.clients.some((id) => id.startsWith("kan")), "an everyday word (כאן) is not read as a brand");

const now = new Date("2026-10-28T12:00:00Z");
const studio = composeBrief({ role: "studio", crafts: ["commercial-production", "branding"], goals: ["clients", "tenders"], now });
ok(studio.updates.length > 0, "studio: some updates");
ok(studio.opportunities.every((o) => o.kind === "tender" ? /מכרז/.test(o.label) : o.source_url), "opportunities are tenders or sourced jobs only");
ok(studio.updates.every((u) => u.why && u.source_url), "every update has a reason and a source");
ok(studio.updates.every((u) => !/הזדמנות/.test(u.label) || u.class === "opportunity"), "only sourced jobs are labelled הזדמנות");
ok(studio.missions.length >= 3, "studio: missions");
const free = composeBrief({ role: "freelance", crafts: ["graphic-design"], goals: ["work"], now });
ok(free.opportunities.some((o) => o.kind === "job"), "freelance: job postings among the opportunities");
const brand = composeBrief({ role: "brand", crafts: [], goals: ["market"], now });
ok(brand.opportunities.length === 0 && brand.companies.length === 0, "brand: no tenders or companies to sell to");
ok(brand.updates[0] && ["campaign", "award"].includes(brand.updates[0].type), `brand: campaigns first (got ${brand.updates[0]?.type})`);
const followed = studio.updates.find((u) => u.org?.id)?.org.id;
if (followed) {
  const f = composeBrief({ role: "studio", crafts: ["branding"], follows: [followed], now });
  ok(f.updates.some((u) => u.followed), "followed companies are marked");
}
const withClient = composeBrief({ role: "studio", crafts: ["branding"], clients: ["isracard"], self: "anka-studio", now });
ok(withClient.updates.some((u) => u.client), "updates about the reader's clients are marked");
ok(!withClient.updates.some((u) => u.org?.id === "anka-studio"), "the reader's own company is left out");
// "שאלו את הסוכן"
const a1 = answer("מי מזמין מושן?", { now });
ok(a1.cards.length > 0 && a1.cards.every((c) => c.kind === "org"), `ask: who commissions motion (${a1.cards.length})`);
const a2 = answer("אילו מכרזים פתוחים?", { now });
ok(a2.cards.every((c) => c.kind === "tender"), "ask: tenders are tenders");
const a3 = answer("מי עובד עם ישראכרט?", { now });
ok(a3.cards.length > 0, `ask: who works with a brand (${a3.title})`);
const a4 = answer("מי עושה מיתוג?", { now });
ok(a4.cards.length > 0 && a4.cards.every((c) => c.kind === "org"), "ask: who makes branding");
const a5 = answer("קקקקקק", { now });
ok(Array.isArray(a5.cards) && a5.lead, "ask: nothing found still answers");
console.log(`studio: ${studio.opportunities.length} opportunities, ${studio.updates.length} updates, ${studio.companies.length} companies`);
for (const u of studio.updates) console.log(`  ${u.label} · ${u.headline.slice(0, 70)}`);
if (fail) { console.log(`${fail} checks failed`); process.exit(1); }
console.log("agent checks passed");
