// Checks for "כלים ו־AI": the data rules (official https links, no affiliate/tracking parameters, dated updates
// with a source, known tools and crafts) and the flag (off: nothing shows anywhere).
// Run after `python3 scripts/landscape.py build`: node scripts/test-tools.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
const { default: file } = await import("../site/data/tools.json", { with: { type: "json" } });
const { default: taxonomy } = await import("../schema/taxonomy.json", { with: { type: "json" } });
const { toolsEnabled, toolsFor, searchTools, toolUpdates } = await import("../lib/tools.js");
const { NAV, FOOTER, MENU, TABS } = await import("../lib/chrome.mjs");

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const crafts = new Set(taxonomy.facets.craft);
const ids = new Set(file.tools.map((x) => x.id));
const TRACKING = /[?&](utm_|ref=|aff|affiliate|via=|fpr=|partner)/i;

t("every tool links to an official https address with no tracking or affiliate parameters", () => {
  for (const x of file.tools) {
    assert.match(x.url, /^https:\/\//, x.id);
    assert.doesNotMatch(x.url, TRACKING, x.id);
    assert.ok(x.sources.length > 0, `${x.id} has no source`);
  }
});
t("every update has a known tool, a date that isn't in the future, an https source and known crafts", () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  for (const u of file.updates) {
    assert.ok(ids.has(u.tool_id), `${u.id}: unknown tool ${u.tool_id}`);
    assert.ok(u.date <= today, `${u.id}: future date`);
    assert.match(u.source_url, /^https:\/\//, u.id);
    assert.doesNotMatch(u.source_url, TRACKING, u.id);
    for (const c of u.crafts) assert.ok(crafts.has(c), `${u.id}: unknown craft ${c}`);
  }
});
t("updates are newest first", () => {
  const d = file.updates.map((u) => u.date);
  assert.deepEqual(d, [...d].sort().reverse());
});
t("no hype words in the Hebrew copy", () => {
  const hype = /מהפכ|משנה את כללי המשחק|פורץ דרך|הכי טוב/;
  for (const u of file.updates) assert.doesNotMatch(`${u.headline_he} ${u.why_he}`, hype, u.id);
  for (const x of file.tools) assert.doesNotMatch(x.one_line_he, hype, x.id);
});
t("the site list reads the updates (toolUpdates) regardless of the flag", () => {
  assert.ok(toolUpdates({ days: 3650 }).length === file.updates.length);
});
t("the flag decides whether tools show in the digest, search and navigation", () => {
  const on = process.env.NEXT_PUBLIC_TOOLS === "on";
  assert.equal(toolsEnabled(), on);
  const linked = [...NAV, ...FOOTER, ...MENU].some((l) => l.href === "/tools");
  assert.equal(linked, on);
  assert.ok(!TABS.some((l) => l.href === "/tools"), "never in the phone tab bar");
  if (!on) {
    assert.deepEqual(toolsFor([]), []);
    assert.deepEqual(searchTools("figma"), []);
  } else {
    assert.ok(searchTools("figma").some((x) => x.id === "figma"));
    assert.ok(toolsFor([], { days: 3650 }).length <= 3);
  }
});

for (const [name, fn] of tests) {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.log(`✗ ${name}\n  ${e.message}`);
  }
}
if (passed !== tests.length) {
  console.log(`${tests.length - passed} of ${tests.length} checks failed`);
  process.exit(1);
}
console.log(`${passed} checks passed${process.env.NEXT_PUBLIC_TOOLS === "on" ? " (TOOLS on)" : ""}`);
