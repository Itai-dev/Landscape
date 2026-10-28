// The agent (/agent): reading a one-line intro, and the briefing it composes. node scripts/test-agent.mjs
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { readIntro, composeBrief } = await import("../lib/agent.js");

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
console.log(`studio: ${studio.opportunities.length} opportunities, ${studio.updates.length} updates, ${studio.companies.length} companies`);
for (const u of studio.updates) console.log(`  ${u.label} · ${u.headline.slice(0, 70)}`);
if (fail) { console.log(`${fail} checks failed`); process.exit(1); }
console.log("agent checks passed");
