// Cleans survey answers from the browser. Anything unknown is dropped; nothing personal is kept
// beyond the account itself (no client or company names are asked, and contact details typed into
// the free-text field are removed).
import {
  CRAFT_SLUGS, MODE_SLUGS, EXPERIENCE, REGIONS, BANDS, EXACT_LIMITS, DELIVERABLES, PAYMENT_TERMS, LATE_SHARE,
  DELAY, CLIENT_TYPES, CHANNELS, MAX_CHANNELS, AI_SCALE, PAIN_MAX, isIndependent,
} from "./config.js";

const slugs = (list) => new Set(list.map((x) => x.slug));
const S = {
  experience: slugs(EXPERIENCE), region: slugs(REGIONS), terms: slugs(PAYMENT_TERMS), late_share: slugs(LATE_SHARE),
  delay: slugs(DELAY), clients: slugs(CLIENT_TYPES), channels: slugs(CHANNELS), ai: slugs(AI_SCALE),
};
const pick = (set, v) => (typeof v === "string" && set.has(v) ? v : null);
const pickMany = (set, v, max = 20) => [...new Set((Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && set.has(x)))].slice(0, max);

export function bandOf(kind, value) {
  return BANDS[kind].find((b) => value >= b.lo && (b.hi == null || value < b.hi))?.slug || null;
}

// A money answer: a band, optionally refined by an exact number. An exact number inside the sanity
// limits wins and sets the band; one outside them is dropped.
function money(kind, bandSlug, exactRaw) {
  const valid = new Set(BANDS[kind].map((b) => b.slug));
  let bandV = typeof bandSlug === "string" && valid.has(bandSlug) ? bandSlug : null;
  let exact = null;
  const n = typeof exactRaw === "number" ? exactRaw : Number(String(exactRaw ?? "").replace(/[^\d.]/g, ""));
  const [lo, hi] = EXACT_LIMITS[kind];
  if (exactRaw !== "" && exactRaw != null && Number.isFinite(n) && n >= lo && n <= hi) {
    exact = Math.round(n);
    bandV = bandOf(kind, exact);
  }
  return { band: bandV, exact };
}

// Removes contact details people sometimes type into free text: emails, links and domains (also without
// http, like linkedin.com/in/…), @handles, phone numbers in any common format and ID-like digit runs.
// Names can't be detected reliably, so the free text itself is never shown anywhere.
export function scrubText(s) {
  return String(s || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[הוסר]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[הוסר]")
    .replace(/\b[\w-]+(\.[\w-]+)*\.(com|net|org|io|me|tv|co|il|info|biz|app|studio|design)(\.il)?(\/\S*)?/gi, "[הוסר]")
    .replace(/(^|[\s(,])@[\w.]{2,}/g, "$1[הוסר]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[הוסר]")
    .replace(/\b\d{7,}\b/g, "[הוסר]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PAIN_MAX);
}

// Returns { answers, missing }. `missing` lists required questions not yet answered (empty = complete).
export function cleanAnswers(raw = {}) {
  const a = {};
  const r = raw && typeof raw === "object" ? raw : {};
  a.craft = CRAFT_SLUGS.includes(r.craft) ? r.craft : null;
  a.craft2 = CRAFT_SLUGS.includes(r.craft2) && r.craft2 !== a.craft ? r.craft2 : null;
  a.mode = MODE_SLUGS.includes(r.mode) ? r.mode : null;
  a.experience = pick(S.experience, r.experience);
  a.region = pick(S.region, r.region);
  const indep = isIndependent(a.mode);
  const employed = a.mode && !indep;

  if (indep) {
    const h = money("hourly", r.hourly, r.hourly_exact);
    const d = money("daily", r.daily, r.daily_exact);
    a.hourly = h.band; a.hourly_exact = h.exact;
    a.daily = d.band; a.daily_exact = d.exact;
    a.prices = {};
    for (const del of DELIVERABLES[a.craft] || []) {
      const p = r.prices?.[del.slug];
      if (!p) continue;
      const m = money("price", p.band, p.exact);
      if (m.band) a.prices[del.slug] = m;
    }
    a.terms = pick(S.terms, r.terms);
    a.late_share = pick(S.late_share, r.late_share);
    a.delay = a.late_share === "none" ? "none" : pick(S.delay, r.delay);
    a.clients = pickMany(S.clients, r.clients);
  }
  if (employed) {
    const s = money("salary", r.salary, r.salary_exact);
    a.salary = s.band; a.salary_exact = s.exact;
  }
  a.channels = pickMany(S.channels, r.channels, MAX_CHANNELS);
  a.ai_demand = pick(S.ai, r.ai_demand);
  a.ai_rates = pick(S.ai, r.ai_rates);
  const pain = scrubText(r.pain);
  if (pain) a.pain = pain;

  const missing = [];
  for (const k of ["craft", "mode", "experience", "region"]) if (!a[k]) missing.push(k);
  if (indep) {
    if (!a.hourly && !a.daily) missing.push("rate");
    for (const k of ["terms", "late_share", "delay"]) if (!a[k]) missing.push(k);
    if (!a.clients.length) missing.push("clients");
  }
  if (employed && !a.salary) missing.push("salary");
  if (!a.channels.length) missing.push("channels");
  if (!a.ai_demand) missing.push("ai_demand");
  if (!a.ai_rates) missing.push("ai_rates");
  return { answers: a, missing };
}
