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
export const stateOf = (t, now = new Date()) => (t.state === "cancelled" ? "cancelled" : due(t) <= now ? "closed" : "open");

// "2.11 · 12:00" in Israel time; the year only when it isn't this year.
export function fmtDeadline(t, now = new Date()) {
  const d = due(t);
  const opt = { timeZone: "Asia/Jerusalem" };
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { ...opt, day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((p) => [p.type, p.value]));
  const thisYear = new Intl.DateTimeFormat("en-GB", { ...opt, year: "numeric" }).format(now);
  const date = `${Number(parts.day)}.${Number(parts.month)}${parts.year !== thisYear ? `.${parts.year}` : ""}`;
  const hasTime = /T\d/.test(t.deadline_at || "");
  return hasTime ? `${date} · ${parts.hour}:${parts.minute}` : date;
}

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
  const n = daysLeft(t, now);
  if (n <= 0) return { text: "נסגר היום", tone: "urgent" };
  if (n === 1) return { text: "נסגר מחר", tone: "urgent" };
  if (n <= 7) return { text: `נשארו ${n} ימים`, tone: "soon" };
  return { text: `נשארו ${n} ימים`, tone: "open" };
}

function card(t, now) {
  return {
    ...t,
    state: stateOf(t, now),
    deadline: fmtDeadline(t, now),
    countdown: countdown(t, now),
    buyer_type_he: BUYER_TYPE_HE[t.buyer_type] || "",
    kind_he: KIND_HE[t.kind] || "מכרז",
    crafts_he: (t.crafts || []).map((c) => ({ slug: c, he: craftLabel(c) })),
    buyer_href: t.buyer_org_id ? `/companies#${encodeURIComponent(t.buyer_org_id)}` : null,
  };
}

/** Open tenders, soonest deadline first; then recently closed ones (most recent first) when `closed` is set. */
export function listTenders({ craft = "", buyerType = "", q = "", closed = false, now = new Date() } = {}) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  const rows = TENDERS.map((t) => card(t, now)).filter((t) =>
    (!craft || t.crafts.includes(craft)) &&
    (!buyerType || t.buyer_type === buyerType) &&
    (!terms.length || terms.every((w) => fold(`${t.title} ${t.buyer} ${t.scope_summary} ${t.crafts_he.map((c) => c.he).join(" ")}`).includes(w))));
  const open = rows.filter((t) => t.state === "open").sort((a, b) => a.deadline_utc.localeCompare(b.deadline_utc));
  if (!closed) return open;
  const done = rows.filter((t) => t.state !== "open").sort((a, b) => b.deadline_utc.localeCompare(a.deadline_utc));
  return [...open, ...done];
}

/** For the digest: open tenders matching any of the crafts (all open ones when none are given). */
export function tendersFor(crafts = [], { now = new Date(), max = 3 } = {}) {
  const open = listTenders({ now });
  const mine = crafts.length ? open.filter((t) => t.crafts.some((c) => crafts.includes(c))) : open;
  return mine.slice(0, max);
}

export const openCount = (now = new Date()) => listTenders({ now }).length;
export const craftsInTenders = () => [...new Set(TENDERS.flatMap((t) => t.crafts || []))];
export const buyerTypesInTenders = () => [...new Set(TENDERS.map((t) => t.buyer_type))];
