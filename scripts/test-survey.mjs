// Unit checks for the survey: answer cleaning and k-anonymous aggregation. Run: node scripts/test-survey.mjs
import assert from "node:assert/strict";
import { cleanAnswers, scrubText, bandOf } from "../lib/survey/validate.js";
import { aggregate, stats, percentile, valueOf, distribution } from "../lib/survey/aggregate.js";
import { K_MIN } from "../lib/survey/config.js";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("ok", name); };

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

t("stats hide groups below K", () => {
  assert.deepEqual(stats("hourly", [100, 200, 300, 400]), { n: 4, hidden: true });
  const s = stats("hourly", [100, 150, 200, 250, 300]);
  assert.equal(s.hidden, undefined);
  assert.equal(s.median, 200);
});

t("distribution hides small groups", () => {
  assert.equal(distribution([{ slug: "a", he: "a" }], ["a", "a"]).hidden, true);
});

t("clean drops unknowns, scrubs contact details, derives band from exact", () => {
  const { answers, missing } = cleanAnswers({
    craft: "motion-design", craft2: "motion-design", mode: "freelancer", experience: "6-10", region: "tel-aviv",
    hourly: "h0", hourly_exact: 220, daily_exact: 99999999, terms: "net60", late_share: "25-50", delay: "1-2m",
    clients: ["agencies", "evil"], channels: ["network", "linkedin", "instagram", "website"], ai_demand: "-1", ai_rates: "0",
    prices: { "explainer-30": { band: "p2" }, "not-mine": { band: "p1" } },
    pain: "התקשרו אליי 050-1234567 או a@b.co.il, הלקוחות משלמים באיחור",
    client_name: "Some Brand",
  });
  assert.equal(answers.craft2, null);
  assert.equal(answers.hourly, "h3");
  assert.equal(answers.hourly_exact, 220);
  assert.equal(answers.daily_exact, null);
  assert.deepEqual(answers.clients, ["agencies"]);
  assert.equal(answers.channels.length, 3);
  assert.deepEqual(Object.keys(answers.prices), ["explainer-30"]);
  assert.ok(!answers.pain.includes("050") && !answers.pain.includes("@"));
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

t("aggregate respects K per cell and never returns free text", () => {
  const base = { experience: "6-10", region: "tel-aviv", terms: "net60", late_share: "lt25", delay: "lt2w", clients: ["brands"], channels: ["network"], ai_demand: "0", ai_rates: "-1", pain: "SECRET" };
  const rows = [];
  for (let i = 0; i < 7; i++) rows.push({ ...base, craft: "motion-design", mode: "freelancer", hourly: "h3", daily: "d3" });
  for (let i = 0; i < 3; i++) rows.push({ ...base, craft: "sound-design", mode: "freelancer", hourly: "h4" });
  for (let i = 0; i < 6; i++) rows.push({ ...base, craft: "editing", mode: "agency", salary: "s3", terms: undefined });
  const r = aggregate(rows);
  assert.equal(r.n, 16);
  const motion = r.rates.find((x) => x.craft === "motion-design");
  const sound = r.rates.find((x) => x.craft === "sound-design");
  assert.equal(motion.hidden, false);
  assert.equal(motion.hourly.median, 230);
  assert.equal(sound.hidden, true);
  assert.equal(sound.hourly, null);
  assert.equal(r.salaries[0].salary.median, 16000);
  assert.equal(r.terms.rows.find((x) => x.slug === "net60").share, 1);
  assert.ok(!JSON.stringify(r).includes("SECRET"));
  assert.equal(r.headline.lateShare, 1);
  assert.equal(K_MIN, 5);
});

console.log(`${passed} checks passed`);
