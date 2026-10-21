// Open tenders ("מכרזים פתוחים"), built by `landscape.py build` into site/data/tenders.json from data/tenders/.
// Facts as published plus a link to the official notice; never contact names. Server only.
// The build marks tenders closed by deadline, but pages render later, so state is recomputed against `now`.
import file from "@/site/data/tenders.json";
import { craftLabel } from "@/lib/taxonomy";
import { fold } from "@/lib/match";

const DAY = 864e5;
const TENDERS = file.tenders || [];

export const BUYER_TYPE_HE = {
  ministry: "משרד ממשלתי",
  municipality: "רשות מקומית",
  gov_company: "חברה ממשלתית",
  university: "אקדמיה",
  public_body: "גוף ציבורי",
  ngo: "עמותה",
};
export const KIND_HE = { tender: "מכרז", framework: "מכרז מסגרת", pool_call: "הצטרפות למאגר", rfi: "בקשה לקבלת מידע", call: "קול קורא" };

const due = (t) => new Date(t.deadline_utc);
const opens = (t) => (t.opens_utc ? new Date(t.opens_utc) : null);

/**
 * Where a tender stands right now (Israel time is baked into the UTC instants by the build):
 * cancelled (as published) > closed (deadline passed) > upcoming (published, submissions not open yet) > open.
 * Only "open" counts as open for bids.
 */
export function stateOf(t, now = new Date()) {
  if (t.status === "cancelled" || t.state === "cancelled") return "cancelled";
  if (t.status === "closed" || due(t) <= now) return "closed";
  const o = opens(t);
  return o && o > now ? "upcoming" : "open";
}

// "2.11 · 12:00" in Israel time; the year only when it isn't this year.
function fmtInstant(d, raw, now) {
  const opt = { timeZone: "Asia/Jerusalem" };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { ...opt, day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((p) => [p.type, p.value]));
  const thisYear = new Intl.DateTimeFormat("en-GB", { ...opt, year: "numeric" }).format(now);
  const date = `${Number(parts.day)}.${Number(parts.month)}${parts.year !== thisYear ? `.${parts.year}` : ""}`;
  return /T\d/.test(raw || "") ? `${date} · ${parts.hour}:${parts.minute}` : date;
}
export const fmtDeadline = (t, now = new Date()) => fmtInstant(due(t), t.deadline_at, now);
export const fmtOpens = (t, now = new Date()) => (opens(t) ? fmtInstant(opens(t), t.submission_opens, now) : "");

// Calendar days left in Israel time: 0 = today, 1 = tomorrow.
function ilDay(d) {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
  return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
}
export const daysLeft = (t, now = new Date()) => Math.round((ilDay(due(t)) - ilDay(now)) / DAY);

export function countdown(t, now = new Date()) {
  const st = stateOf(t, now);
  if (st === "cancelled") return { text: "בוטל", tone: "closed" };
  if (st === "closed") return { text: "נסגר", tone: "closed" };
  if (st === "upcoming") return { text: `ההגשה נפתחת ב־${fmtOpens(t, now).split(" · ")[0]}`, tone: "upcoming" };
  const n = daysLeft(t, now);
  if (n <= 0) return { text: "נסגר היום", tone: "urgent" };
  if (n === 1) return { text: "נסגר מחר", tone: "urgent" };
  if (n <= 7) return { text: `נשארו ${n} ימים`, tone: "soon" };
  return { text: `נשארו ${n} ימים`, tone: "open" };
}

// The one-line "when" under a tender, by state.
function whenOf(state, deadline, opensAt) {
  if (state === "upcoming") return `ההגשה נפתחת ב־${opensAt}, ועד ${deadline}`;
  if (state === "open") return `הגשה עד ${deadline}`;
  if (state === "cancelled") return `בוטל. מועד ההגשה המקורי: ${deadline}`;
  return `ההגשה הייתה עד ${deadline}`;
}

function card(t, now) {
  const state = stateOf(t, now);
  const deadline = fmtDeadline(t, now);
  const opensAt = fmtOpens(t, now);
  return {
    ...t,
    state,
    deadline,
    opens: opensAt,
    when: whenOf(state, deadline, opensAt),
    countdown: countdown(t, now),
    buyer_type_he: BUYER_TYPE_HE[t.buyer_type] || "",
    kind_he: KIND_HE[t.kind] || "מכרז",
    crafts_he: (t.crafts || []).map((c) => ({ slug: c, he: craftLabel(c) })),
    buyer_href: t.buyer_org_id ? `/companies/${encodeURIComponent(t.buyer_org_id)}` : null,
  };
}

/**
 * Live tenders: open ones (soonest deadline first), then upcoming ones (soonest opening first).
 * With `closed`, recently closed and cancelled ones follow (most recent first).
 * Callers that need "open for bids" filter on state === "open"; upcoming is never open.
 */
export function listTenders({ craft = "", buyerType = "", q = "", closed = false, now = new Date() } = {}) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  const rows = TENDERS.map((t) => card(t, now)).filter((t) =>
    (!craft || t.crafts.includes(craft)) &&
    (!buyerType || t.buyer_type === buyerType) &&
    (!terms.length || terms.every((w) => fold(`${t.title} ${t.buyer} ${t.scope_summary} ${t.crafts_he.map((c) => c.he).join(" ")}`).includes(w))));
  const open = rows.filter((t) => t.state === "open").sort((a, b) => a.deadline_utc.localeCompare(b.deadline_utc));
  const upcoming = rows.filter((t) => t.state === "upcoming").sort((a, b) => a.opens_utc.localeCompare(b.opens_utc));
  if (!closed) return [...open, ...upcoming];
  const done = rows.filter((t) => t.state === "closed" || t.state === "cancelled").sort((a, b) => b.deadline_utc.localeCompare(a.deadline_utc));
  return [...open, ...upcoming, ...done];
}

/** For the digest: live tenders (open first, then upcoming) matching any of the crafts (all when none are given). */
export function tendersFor(crafts = [], { now = new Date(), max = 3 } = {}) {
  const live = listTenders({ now });
  const mine = crafts.length ? live.filter((t) => t.crafts.some((c) => crafts.includes(c))) : live;
  return mine.slice(0, max);
}

/** Counts by state, against `now`: { open, upcoming }. Only `open` may be called open for submission. */
export function tenderCounts(now = new Date()) {
  const live = listTenders({ now });
  return { open: live.filter((t) => t.state === "open").length, upcoming: live.filter((t) => t.state === "upcoming").length };
}
export const openCount = (now = new Date()) => tenderCounts(now).open;
export const craftsInTenders = () => [...new Set(TENDERS.flatMap((t) => t.crafts || []))];
export const buyerTypesInTenders = () => [...new Set(TENDERS.map((t) => t.buyer_type))];
