// Unit checks for the survey: answer cleaning, k-anonymous aggregation and snapshot rules.
// Run: node scripts/test-survey.mjs
import assert from "node:assert/strict";
import { cleanAnswers, scrubText, bandOf } from "../lib/survey/validate.js";
import { aggregate, stats, percentile, valueOf, distribution, nBucket, roundShare } from "../lib/survey/aggregate.js";
import { K_MIN, K_EXACT } from "../lib/survey/config.js";
import { refreshSnapshot } from "../lib/survey/server.js";

let passed = 0;
const pending = [];
const t = (name, fn) => {
  const r = fn();
  if (r && typeof r.then === "function") pending.push(r.then(() => { passed++; console.log("ok", name); }));
  else { passed++; console.log("ok", name); }
};

const BASE = { experience: "6-10", region: "tel-aviv", terms: "net60", late_share: "lt25", delay: "lt2w", clients: ["brands"], channels: ["network"], ai_demand: "0", ai_rates: "-1" };
const free = (o = {}) => ({ ...BASE, craft: "motion-design", mode: "freelancer", hourly: "h3", daily: "d3", ...o });

t("percentile interpolates", () => {
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([10], 0.25), 10);
});

t("bands and values", () => {
  assert.equal(bandOf("hourly", 180), "h2");
  assert.equal(bandOf("hourly", 600), "h6");
  assert.equal(valueOf("hourly", "h2", null), 175);
  assert.equal(valueOf("hourly", "h6", null), 625);
  assert.equal(valueOf("hourly", "h2", 160), 160);
});

t("group sizes are buckets, shares are rounded to 5%", () => {
  assert.equal(nBucket(4), 0);
  assert.equal(nBucket(5), 5);
  assert.equal(nBucket(9), 5);
  assert.equal(nBucket(37), 20);
  assert.equal(nBucket(120), 100);
  assert.equal(roundShare(1 / 11), 0.1);
  assert.equal(roundShare(0.42), 0.4);
});

t("stats hide groups below K and use band midpoints below K_EXACT", () => {
  assert.equal(stats("hourly", [{ band: "h1" }, { band: "h2" }, { band: "h3" }, { band: "h4" }]), null);
  // Five people who typed exact numbers: the published numbers come from bands, not their figures.
  const five = [180, 210, 260, 300, 420].map((v) => ({ band: bandOf("hourly", v), exact: v }));
  const s = stats("hourly", five);
  assert.equal(s.nb, 5);
  assert.deepEqual(s, stats("hourly", five.map((a) => ({ band: a.band }))));
  assert.deepEqual([s.p25, s.median], [230, 300]); // band midpoints (225, 300), not the typed 210 / 260
  // From K_EXACT answers, exact figures count.
  const ten = Array.from({ length: K_EXACT }, (_, i) => ({ band: "h3", exact: 200 + i }));
  assert.equal(stats("hourly", ten).median, 200);
});

t("distribution hides small groups", () => {
  assert.equal(distribution([{ slug: "a", he: "a" }], ["a", "a"]), null);
});

t("clean drops unknowns, scrubs contact details, derives band from exact", () => {
  const { answers, missing } = cleanAnswers({
    craft: "motion-design", craft2: "motion-design", mode: "freelancer", experience: "6-10", region: "tel-aviv",
    hourly: "h0", hourly_exact: 220, daily_exact: 99999999, terms: "net60", late_share: "25-50", delay: "1-2m",
    clients: ["agencies", "evil"], channels: ["network", "linkedin", "instagram", "website"], ai_demand: "-1", ai_rates: "0",
    prices: { "explainer-30": { band: "p2" }, "not-mine": { band: "p1" } },
    pain: "התקשרו אליי 050-1234567 או a@b.co.il, @dana.motion linkedin.com/in/dana, הלקוחות משלמים באיחור",
    client_name: "Some Brand",
  });
  assert.equal(answers.craft2, null);
  assert.equal(answers.hourly, "h3");
  assert.equal(answers.hourly_exact, 220);
  assert.equal(answers.daily_exact, null);
  assert.deepEqual(answers.clients, ["agencies"]);
  assert.equal(answers.channels.length, 3);
  assert.deepEqual(Object.keys(answers.prices), ["explainer-30"]);
  for (const bad of ["050", "@", "linkedin", "dana"]) assert.ok(!answers.pain.includes(bad), bad);
  assert.equal(answers.client_name, undefined);
  assert.deepEqual(missing, []);
});

t("employees answer salary, not rates", () => {
  const { answers, missing } = cleanAnswers({ craft: "editing", mode: "inhouse", experience: "3-5", region: "sharon", hourly: "h3", terms: "net30" });
  assert.equal(answers.hourly, undefined);
  assert.equal(answers.terms, undefined);
  assert.ok(missing.includes("salary") && missing.includes("channels"));
});

t("scrub keeps plain text", () => assert.equal(scrubText("  שוטף+90 זה נורמלי  "), "שוטף+90 זה נורמלי"));

t("aggregate leaves small groups out entirely and never returns free text", () => {
  const rows = [];
  for (let i = 0; i < 7; i++) rows.push(free({ pain: "SECRET" }));
  for (let i = 0; i < 3; i++) rows.push(free({ craft: "sound-design", hourly: "h4" }));
  for (let i = 0; i < 6; i++) rows.push({ ...BASE, craft: "editing", mode: "agency", salary: "s3", terms: undefined });
  const r = aggregate(rows);
  assert.equal(r.n, 16);
  assert.equal(r.nb, 10);
  const motion = r.rates.find((x) => x.craft === "motion-design");
  assert.equal(motion.hourly.median, 230);
  assert.equal(motion.nb, 5);
  assert.equal(r.rates.find((x) => x.craft === "sound-design"), undefined); // not listed at all
  assert.equal(r.salaries[0].salary.median, 16000);
  assert.equal(r.terms.rows.find((x) => x.slug === "net60").share, 1);
  const json = JSON.stringify(r);
  assert.ok(!json.includes("SECRET"));
  assert.ok(!/"n":\s*(7|3|6)\b/.test(json)); // no exact group sizes besides the server-only total
  assert.equal(r.headline.lateShare, 1);
  assert.equal(K_MIN, 5);
});

t("aggregate cleans stored rows again (writes around the API are ignored)", () => {
  const rows = Array.from({ length: 6 }, () => free());
  rows.push({ ...free(), hourly_exact: 1e7, completed: true }); // out of limits: ignored, band stays
  rows.push({ craft: "motion-design", mode: "freelancer" }); // incomplete: not counted
  rows.push({ ...free(), craft: "made-up" }); // invalid craft: not counted
  const r = aggregate(rows);
  assert.equal(r.n, 7);
  assert.ok(r.rates[0].hourly.p75 < 1000);
});

t("one new answer can't be learned by comparing results", () => {
  const pop = Array.from({ length: 40 }, (_, i) => free({ hourly: ["h2", "h3", "h4"][i % 3], terms: ["net30", "net60"][i % 2] }));
  const before = aggregate(pop);
  const after = aggregate([...pop, free({ terms: "longer", late_share: "gt75", delay: "gt2m", clients: ["public"], channels: ["xplace"], ai_demand: "-2", ai_rates: "-2" })]);
  // Shares are rounded to 5% and sizes bucketed, so a single extra answer leaves the published numbers unchanged.
  for (const k of ["terms", "late", "delay", "clients", "channelsIndependent", "aiDemand", "aiRates"]) {
    assert.deepEqual(after[k], before[k], k);
  }
});

// A fake service-role client: just enough of supabase-js for refreshSnapshot.
function fakeAdmin(state) {
  return {
    from(table) {
      const q = { table, filters: [], head: false };
      const api = {
        select(_c, opts) { if (opts?.head) q.head = true; return api; },
        eq(k, v) { q.filters.push([k, v]); return api; },
        range() { return api; },
        maybeSingle() { return Promise.resolve({ data: state.snapshot, error: null }); },
        upsert(row) { state.snapshot = row; state.writes++; return Promise.resolve({ error: null }); },
        then(res) {
          if (table === "survey_responses" && q.head) return Promise.resolve({ count: state.responses.length, error: null }).then(res);
          return Promise.resolve({ data: state.responses.map((a) => ({ answers: a })), error: null }).then(res);
        },
      };
      return api;
    },
  };
}

t("snapshot: at most once a day, and only after 5 new responses", async () => {
  const state = { snapshot: null, writes: 0, responses: Array.from({ length: 12 }, () => free()) };
  const db = fakeAdmin(state);
  const t0 = Date.parse("2026-11-01T08:00:00Z");
  assert.equal((await refreshSnapshot(db, { now: t0 })).refreshed, true);
  state.responses.push(...Array.from({ length: 6 }, () => free()));
  assert.equal((await refreshSnapshot(db, { now: t0 + 3600e3 })).reason, "too_soon");
  state.responses.length = 14; // 2 new since the snapshot
  assert.equal((await refreshSnapshot(db, { now: t0 + 25 * 3600e3 })).reason, "not_enough_new");
  state.responses.push(...Array.from({ length: 3 }, () => free())); // 5 new
  assert.equal((await refreshSnapshot(db, { now: t0 + 26 * 3600e3 })).refreshed, true);
  assert.equal(state.writes, 2);
});

await Promise.all(pending);
console.log(`${passed} checks passed`);
