// Aggregates completed survey answers into the results page. Server only (reads every response with the
// service key); the output holds counts and percentiles, never single answers or free text.
// k-anonymity: any group smaller than K_MIN is returned as { hidden: true, n } with no numbers.
import {
  K_MIN, BANDS, DELIVERABLES, SURVEY_CRAFTS, MODES, PAYMENT_TERMS, LATE_SHARE, DELAY, CLIENT_TYPES, CHANNELS,
  AI_SCALE, isIndependent,
} from "./config.js";

const ROUND = { hourly: 10, daily: 50, salary: 500, price: 500 };

// The number used for an answer: the exact figure when given, else the middle of its band
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

// p25 / median / p75 for a group, or hidden when the group is smaller than K_MIN.
export function stats(kind, values, k = K_MIN) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length < k) return { n: xs.length, hidden: true };
  return { n: xs.length, p25: round(kind, percentile(xs, 0.25)), median: round(kind, percentile(xs, 0.5)), p75: round(kind, percentile(xs, 0.75)) };
}

// Share of each option among answers, or hidden for a small group.
export function distribution(list, values, k = K_MIN) {
  const xs = values.filter(Boolean);
  if (xs.length < k) return { n: xs.length, hidden: true };
  const rows = list.map((o) => ({ slug: o.slug, he: o.he, count: xs.filter((v) => v === o.slug).length }));
  return { n: xs.length, rows: rows.map((r) => ({ slug: r.slug, he: r.he, share: r.count / xs.length })) };
}

// Multi-select: share of respondents who picked each option, most picked first.
export function ranking(list, arrays, k = K_MIN) {
  const xs = arrays.filter((a) => Array.isArray(a) && a.length);
  if (xs.length < k) return { n: xs.length, hidden: true };
  const rows = list
    .map((o) => ({ slug: o.slug, he: o.he, share: xs.filter((a) => a.includes(o.slug)).length / xs.length }))
    .filter((r) => r.share > 0)
    .sort((a, b) => b.share - a.share);
  return { n: xs.length, rows };
}

const SLOW_TERMS = new Set(["net60", "net90", "longer"]);

export function aggregate(all, k = K_MIN) {
  const answers = all.filter((a) => a && a.craft && a.mode);
  const indep = answers.filter((a) => isIndependent(a.mode));
  const employed = answers.filter((a) => a.mode && !isIndependent(a.mode));

  // Rates by craft × independent mode; salaries by craft × employed mode. Small cells stay hidden.
  const rates = [];
  const salaries = [];
  const prices = [];
  for (const c of SURVEY_CRAFTS) {
    const inCraft = answers.filter((a) => a.craft === c.slug);
    if (!inCraft.length) continue;
    for (const m of MODES) {
      const g = inCraft.filter((a) => a.mode === m.slug);
      if (!g.length) continue;
      if (isIndependent(m.slug)) {
        rates.push({
          craft: c.slug, craftHe: c.he, mode: m.slug, modeHe: m.he, n: g.length,
          hidden: g.length < k,
          hourly: g.length < k ? null : stats("hourly", g.map((a) => valueOf("hourly", a.hourly, a.hourly_exact)), k),
          daily: g.length < k ? null : stats("daily", g.map((a) => valueOf("daily", a.daily, a.daily_exact)), k),
        });
      } else {
        salaries.push({
          craft: c.slug, craftHe: c.he, mode: m.slug, modeHe: m.he, n: g.length,
          hidden: g.length < k,
          salary: g.length < k ? null : stats("salary", g.map((a) => valueOf("salary", a.salary, a.salary_exact)), k),
        });
      }
    }
    for (const d of DELIVERABLES[c.slug] || []) {
      const vals = inCraft.filter((a) => isIndependent(a.mode) && a.prices?.[d.slug])
        .map((a) => valueOf("price", a.prices[d.slug].band, a.prices[d.slug].exact));
      if (!vals.length) continue;
      prices.push({ craft: c.slug, craftHe: c.he, deliverable: d.slug, deliverableHe: d.he, ...stats("price", vals, k) });
    }
  }

  const freelancers = indep.filter((a) => a.mode === "freelancer");
  const hourlyAll = stats("hourly", freelancers.map((a) => valueOf("hourly", a.hourly, a.hourly_exact)), k);
  const termsKnown = indep.filter((a) => a.terms);
  const lateKnown = indep.filter((a) => a.late_share);

  return {
    n: answers.length,
    nIndependent: indep.length,
    nEmployed: employed.length,
    headline: {
      freelanceHourlyMedian: hourlyAll.hidden ? null : hourlyAll.median,
      slowTermsShare: termsKnown.length >= k ? termsKnown.filter((a) => SLOW_TERMS.has(a.terms)).length / termsKnown.length : null,
      lateShare: lateKnown.length >= k ? lateKnown.filter((a) => a.late_share !== "none").length / lateKnown.length : null,
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
