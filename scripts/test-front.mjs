// Checks for the news front (lib/front.js): the lead is a story (never a job), nothing is shown twice, a
// reader's crafts and tracked companies pull matching stories up, opportunities are only sourced jobs and live
// tenders, and every update has a page. Run after `npm run build`: node scripts/test-front.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
const { composeFront, listUpdates, storyScore, updateById, updateItem, moreAbout, relatedUpdates, UPDATES, BEATS, orgIdsOf, shortTitle, titleOf } = await import("../lib/front.js");
const { signalCrafts } = await import("../lib/digest.js");

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const NOW = new Date("2026-11-05T09:00:00Z");
const ids = (xs) => xs.map((i) => i.id);

t("the general front has a lead that is a story, not a job, and dated", () => {
  const f = composeFront({ now: NOW });
  assert.ok(f.lead, "a lead");
  assert.notEqual(f.lead.type, "hiring");
  assert.match(f.lead.href, /^\/updates\/[a-z0-9-]+$/);
  assert.ok(f.lead.day && f.lead.headline);
  assert.ok(f.dateline.includes("יום"), f.dateline);
  assert.ok(f.stats.orgs > 400);
});

t("nothing appears twice across lead, tracked, top and the beats", () => {
  const f = composeFront({ now: NOW });
  const all = [f.lead.id, ...ids(f.tracked), ...ids(f.top), ...f.beats.flatMap((b) => ids(b.items))];
  assert.equal(new Set(all).size, all.length, all.join(","));
  for (const b of f.beats) for (const i of b.items) assert.ok(BEATS.find((x) => x.key === b.key).types.includes(i.type), `${i.id} in ${b.key}`);
});

t("the lead ranks fresh, weighty, well-linked stories first", () => {
  const today = "2026-11-05";
  const base = { id: "x", headline_he: "x", date: "2026-11-04", added: "2026-11-04" };
  const move = storyScore({ ...base, type: "agency_move" }, { today });
  const award = storyScore({ ...base, type: "award" }, { today });
  const oldMove = storyScore({ ...base, type: "agency_move", date: "2026-10-01", added: "2026-10-01" }, { today });
  const job = storyScore({ ...base, type: "hiring", source_url: "https://x" }, { today });
  assert.ok(move > award && move > oldMove && award > job, [move, award, oldMove, job].join(" "));
  // Reached us only now: fresh again, unless it happened over a month ago.
  assert.ok(storyScore({ ...base, type: "campaign", date: "2026-10-20", added: "2026-11-04" }, { today }) > storyScore({ ...base, type: "campaign", date: "2026-10-20", added: "2026-10-20" }, { today }));
  assert.equal(storyScore({ ...base, type: "campaign", date: "2026-09-01", added: "2026-11-04" }, { today }), storyScore({ ...base, type: "campaign", date: "2026-09-01", added: "2026-09-01" }, { today }));
});

t("a reader's crafts pull matching stories up and mark them", () => {
  const general = composeFront({ now: NOW });
  // Pick a craft that a recent story names; a reader in that craft should see it marked, and higher.
  const story = UPDATES.find((s) => s.type !== "hiring" && signalCrafts(s).strong.size > 0 && s.date >= "2026-10-15");
  assert.ok(story, "a recent story that names a craft");
  const craft = [...signalCrafts(story).strong][0];
  const mine = composeFront({ crafts: [craft], now: NOW });
  const marked = [mine.lead, ...mine.top, ...mine.beats.flatMap((b) => b.items)].filter((i) => i.mine);
  assert.ok(marked.length > 0, "something marked as in the reader's craft");
  assert.ok(marked.every((i) => i.crafts.some((c) => c.slug === craft)));
  assert.deepEqual(mine.crafts.map((c) => c.slug), [craft]);
  assert.equal(mine.personal, true);
  assert.equal(general.personal, false);
  const pos = (f, id) => [f.lead, ...f.top].findIndex((i) => i.id === id);
  if (pos(general, story.id) >= 0) assert.ok(pos(mine, story.id) <= pos(general, story.id));
});

t("tracked companies get their own list, first, and are not repeated", () => {
  const f0 = composeFront({ now: NOW });
  const org = f0.lead.org?.id || f0.top.find((i) => i.org?.id)?.org.id;
  assert.ok(org, "a story about a company in the directory");
  const f = composeFront({ follows: [org, "no-such-org"], now: NOW });
  const about = [f.lead, ...f.tracked].filter((i) => orgIdsOf(updateById(i.id)).includes(org));
  assert.ok(about.length > 0, "the tracked company's story is the lead or in במעקב שלכם");
  assert.ok([f.lead, ...f.tracked].every((i) => !i.tracked || orgIdsOf(updateById(i.id)).includes(org)));
  assert.ok(f.top.every((i) => !f.tracked.some((x) => x.id === i.id)));
});

t("opportunities are only sourced job postings and live tenders", () => {
  const f = composeFront({ now: NOW });
  for (const j of f.jobs) { assert.equal(j.type, "hiring"); assert.ok(j.source_url); assert.equal(j.class, "opportunity"); }
  for (const x of f.tenders) assert.ok(["open", "upcoming"].includes(x.state), x.state);
  for (const x of f.tenders.filter((x) => x.state === "upcoming")) assert.match(x.label, /ההגשה נפתחת/);
  assert.ok(f.jobs.length <= 5 && f.tenders.length <= 3);
});

t("the front never runs empty: a quiet fortnight widens the window", () => {
  const f = composeFront({ now: new Date("2027-01-10T09:00:00Z") });
  assert.ok(f.span >= 30, String(f.span));
  assert.ok(f.lead);
});

t("every update has a page with its own data; unknown ids have none", () => {
  assert.ok(UPDATES.length > 50);
  assert.equal(new Set(UPDATES.map((s) => s.id)).size, UPDATES.length, "unique ids");
  for (const s of UPDATES.slice(0, 20)) {
    const i = updateItem(s);
    assert.equal(i.href, `/updates/${encodeURIComponent(s.id)}`);
    assert.ok(i.headline && i.day && i.class_label);
    assert.ok(moreAbout(s).every((x) => x.id !== s.id));
    assert.ok(relatedUpdates(s, { now: NOW }).every((x) => x.id !== s.id && x.beat === i.beat));
  }
  assert.equal(updateById("nope"), null);
});

t("the archive filters by beat and crafts, newest first", () => {
  const all = listUpdates({ now: NOW, days: 365 });
  assert.ok(all.length >= 50);
  for (let k = 1; k < all.length; k++) assert.ok(all[k - 1].seen >= all[k].seen);
  const jobs = listUpdates({ beat: "jobs", now: NOW, days: 365 });
  assert.ok(jobs.length > 0 && jobs.every((i) => i.type === "hiring"));
  const craft = [...signalCrafts(UPDATES[0]).strong][0] || "ai-creative";
  const mine = listUpdates({ crafts: [craft], now: NOW, days: 365 });
  assert.ok(mine.every((i) => i.mine && i.crafts.some((c) => c.slug === craft)));
});

t("every update has a short title: research's title_he, else the headline cut at a clause", () => {
  for (const s of UPDATES) {
    const title = titleOf(s);
    assert.ok(title.length > 0 && title.length <= 91, `${s.id}: ${title}`);
    assert.ok(s.headline_he.startsWith(title.replace(/…$/, "")), s.id);
  }
  assert.equal(titleOf({ title_he: " כותרת קצרה ", headline_he: "משהו ארוך: ועוד" }), "כותרת קצרה");
  assert.equal(shortTitle("הודעת פטור של לפ״מ: התקשרות עם גריי קונטנט לקמפיין יום ההוקרה, עם עוד פרטים"), "הודעת פטור של לפ״מ: התקשרות עם גריי קונטנט לקמפיין יום ההוקרה");
  assert.equal(shortTitle("Affle ההודית תרכוש את חברת האד־טק הישראלית פריון ב־420 מיליון דולר (11.70 דולר למניה)"), "Affle ההודית תרכוש את חברת האד־טק הישראלית פריון ב־420 מיליון דולר");
  assert.equal(shortTitle("כותרת קצרה בלי סימנים"), "כותרת קצרה בלי סימנים");
  assert.match(shortTitle("מילה ".repeat(40).trim()), /…$/);
  assert.equal(updateItem(UPDATES[0]).title, titleOf(UPDATES[0]));
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} front checks passed`);
