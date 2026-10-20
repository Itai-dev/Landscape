// Aggregates completed survey answers into the results page. Server only (reads every response with the
// service key); the output holds rounded shares and percentiles, never single answers or free text.
// Protections against learning one person's answers:
// - every stored answer is cleaned again here (anything written around the API is ignored);
// - a group smaller than K_MIN is left out entirely (not even listed as "too small");
// - exact typed numbers are used only in groups of K_EXACT or more, otherwise band midpoints;
// - group sizes are published as buckets ("10+"), shares are rounded to 5%;
// - results are published from a daily snapshot (lib/survey/server.js), not live.
import {
  K_MIN, K_EXACT, BANDS, DELIVERABLES, SURVEY_CRAFTS, MODES, PAYMENT_TERMS, LATE_SHARE, DELAY, CLIENT_TYPES, CHANNELS,
  AI_SCALE, isIndependent,
} from "./config.js";
import { cleanAnswers } from "./validate.js";

const ROUND = { hourly: 10, daily: 50, salary: 500, price: 500 };
const BUCKETS = [500, 200, 100, 50, 20, 10, 5];

// The published size of a group: the largest bucket it reaches ("10+"), never the exact count.
export const nBucket = (n) => BUCKETS.find((b) => n >= b) || 0;
export const roundShare = (x) => Math.round(x * 20) / 20;

// The number used for an answer: the exact figure when allowed and given, else the middle of its band
// (an open top band counts as 25% above its floor).
export function valueOf(kind, band, exact) {
  if (Number.isFinite(exact)) return exact;
  const b = BANDS[kind].find((x) => x.slug === band);
  if (!b) return null;
  return b.hi == null ? b.lo * 1.25 : (b.lo + b.hi) / 2;
}

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const round = (kind, v) => (v == null ? null : Math.round(v / ROUND[kind]) * ROUND[kind]);

// p25 / median / p75 for a group of { band, exact } answers, or null when the group is smaller than k.
// Exact numbers count only from K_EXACT answers up; below that every answer is its band's midpoint.
export function stats(kind, answers, k = K_MIN) {
  const xs0 = answers.filter((a) => a && (a.band || Number.isFinite(a.exact)));
  if (xs0.length < k) return null;
  const useExact = xs0.length >= Math.max(k, K_EXACT);
  const xs = xs0.map((a) => valueOf(kind, a.band, useExact ? a.exact : null)).filter(Number.isFinite).sort((a, b) => a - b);
  if (xs.length < k) return null;
  return { nb: nBucket(xs.length), p25: round(kind, percentile(xs, 0.25)), median: round(kind, percentile(xs, 0.5)), p75: round(kind, percentile(xs, 0.75)) };
}

// Share of each option among answers, or null for a small group.
export function distribution(list, values, k = K_MIN) {
  const xs = values.filter(Boolean);
  if (xs.length < k) return null;
  return { nb: nBucket(xs.length), rows: list.map((o) => ({ slug: o.slug, he: o.he, share: roundShare(xs.filter((v) => v === o.slug).length / xs.length) })) };
}

// Multi-select: share of respondents who picked each option, most picked first.
export function ranking(list, arrays, k = K_MIN) {
  const xs = arrays.filter((a) => Array.isArray(a) && a.length);
  if (xs.length < k) return null;
  const rows = list
    .map((o) => ({ slug: o.slug, he: o.he, share: roundShare(xs.filter((a) => a.includes(o.slug)).length / xs.length) }))
    .filter((r) => r.share > 0)
    .sort((a, b) => b.share - a.share);
  return { nb: nBucket(xs.length), rows };
}

const SLOW_TERMS = new Set(["net60", "net90", "longer"]);
const money = (a, kind) => ({ band: a[kind], exact: a[`${kind}_exact`] });

// Only complete, valid answers count. Stored rows are cleaned again, whatever wrote them.
export function validAnswers(all) {
  return (all || []).map((raw) => cleanAnswers(raw)).filter((r) => r.missing.length === 0).map((r) => r.answers);
}

export function aggregate(all, k = K_MIN) {
  const answers = validAnswers(all);
  const indep = answers.filter((a) => isIndependent(a.mode));
  const employed = answers.filter((a) => a.mode && !isIndependent(a.mode));

  // Rates by craft × independent mode; salaries by craft × employed mode. Small groups are left out.
  const rates = [];
  const salaries = [];
  const prices = [];
  for (const c of SURVEY_CRAFTS) {
    const inCraft = answers.filter((a) => a.craft === c.slug);
    if (inCraft.length < k) continue;
    for (const m of MODES) {
      const g = inCraft.filter((a) => a.mode === m.slug);
      if (g.length < k) continue;
      if (isIndependent(m.slug)) {
        const hourly = stats("hourly", g.map((a) => money(a, "hourly")), k);
        const daily = stats("daily", g.map((a) => money(a, "daily")), k);
        if (hourly || daily) rates.push({ craft: c.slug, craftHe: c.he, mode: m.slug, modeHe: m.he, nb: nBucket(g.length), hourly, daily });
      } else {
        const salary = stats("salary", g.map((a) => money(a, "salary")), k);
        if (salary) salaries.push({ craft: c.slug, craftHe: c.he, mode: m.slug, modeHe: m.he, nb: nBucket(g.length), salary });
      }
    }
    for (const d of DELIVERABLES[c.slug] || []) {
      const s = stats("price", inCraft.filter((a) => isIndependent(a.mode) && a.prices?.[d.slug]).map((a) => a.prices[d.slug]), k);
      if (s) prices.push({ craft: c.slug, craftHe: c.he, deliverable: d.slug, deliverableHe: d.he, ...s });
    }
  }

  const freelancers = indep.filter((a) => a.mode === "freelancer");
  const hourlyAll = stats("hourly", freelancers.map((a) => money(a, "hourly")), k);
  const termsKnown = indep.filter((a) => a.terms);
  const lateKnown = indep.filter((a) => a.late_share);

  return {
    n: answers.length, // server only: the results page shows nBucket(n)
    nb: nBucket(answers.length),
    headline: {
      freelanceHourlyMedian: hourlyAll ? hourlyAll.median : null,
      slowTermsShare: termsKnown.length >= k ? roundShare(termsKnown.filter((a) => SLOW_TERMS.has(a.terms)).length / termsKnown.length) : null,
      lateShare: lateKnown.length >= k ? roundShare(lateKnown.filter((a) => a.late_share !== "none").length / lateKnown.length) : null,
    },
    rates,
    salaries,
    prices,
    terms: distribution(PAYMENT_TERMS, indep.map((a) => a.terms), k),
    late: distribution(LATE_SHARE, indep.map((a) => a.late_share), k),
    delay: distribution(DELAY.filter((d) => d.slug !== "none"), indep.filter((a) => a.late_share && a.late_share !== "none").map((a) => a.delay), k),
    clients: ranking(CLIENT_TYPES, indep.map((a) => a.clients), k),
    channelsIndependent: ranking(CHANNELS, indep.map((a) => a.channels), k),
    channelsEmployed: ranking(CHANNELS, employed.map((a) => a.channels), k),
    aiDemand: distribution(AI_SCALE, answers.map((a) => a.ai_demand), k),
    aiRates: distribution(AI_SCALE, answers.map((a) => a.ai_rates), k),
  };
}
