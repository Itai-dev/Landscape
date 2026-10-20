// "השבוע בתעשייה": the weekly digest, composed from the published directory (site/data) only.
// No per-person data here: callers pass the crafts and topics a reader chose. Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import index from "@/lib/generated/orgs.json";
import { CRAFT_SLUGS, craftLabel } from "@/lib/taxonomy";

const DAY = 864e5;
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
const INDEX = new Map(index.orgs.map((o) => [o.id, o]));
const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && s.headline_he);
// Everything added on the first build day is the starting map, not "new this week".
const BASELINE = dataset.orgs.reduce((m, o) => (o.added && o.added < m ? o.added : m), "9999");

export const SIG_LABEL = {
  new_exec: "מינוי בשיווק", agency_move: "החלפת משרד פרסום", campaign: "קמפיין", hiring: "דרושים", funding: "גיוס הון",
  launch: "השקה", rebrand: "מיתוג מחדש", acquisition: "רכישה", ownership: "בעלות", award: "פרס", closure: "סגירה",
};
// What tends to lead to work first.
const WEIGHT = { new_exec: 6, agency_move: 6, hiring: 5, campaign: 4, funding: 4, launch: 4, rebrand: 4, acquisition: 2, ownership: 2, award: 2, closure: 1 };
// Newsletter topics (lib/taxonomy TOPICS) → update types. No topics chosen = all of them.
const TOPIC_TYPES = {
  signals: ["new_exec", "agency_move", "ownership", "acquisition", "rebrand", "closure"],
  jobs: ["hiring"],
  campaigns: ["campaign", "award"],
  funding: ["funding"],
  events: ["launch", "award"],
};
const BUYER_KINDS = new Set(["client", "agency"]);

export const PERIOD_DAYS = { weekly: 7, biweekly: 14, monthly: 31 };

export function siteUrl() {
  const u = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "landscape-ten-phi.vercel.app";
  return (u.startsWith("http") ? u : `https://${u}`).replace(/\/$/, "");
}

// --- Dates (Israel time) ---------------------------------------------------------------------------------
const ilDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d); // YYYY-MM-DD
const utcDay = (iso) => new Date(`${iso}T00:00:00Z`);
const isoOf = (d) => d.toISOString().slice(0, 10);
export const fmtDay = (iso) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" }).format(utcDay(iso));

// The edition a moment belongs to: the Sunday on or before it, in Israel.
export function editionOf(now = new Date()) {
  const d = utcDay(ilDate(now));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return isoOf(d);
}

// Is a reader with this frequency due for this edition? Weekly: every Sunday. Biweekly: every other Sunday
// (counted from a fixed Sunday). Monthly: the first Sunday of the month.
const EPOCH_SUNDAY = utcDay("2026-01-04");
export function dueFor(frequency, edition) {
  const d = utcDay(edition);
  if (frequency === "weekly") return true;
  if (frequency === "biweekly") return Math.round((d - EPOCH_SUNDAY) / (7 * DAY)) % 2 === 0;
  if (frequency === "monthly") return d.getUTCDate() <= 7;
  return false;
}

// --- Composition -----------------------------------------------------------------------------------------
const name = (o) => (o ? o.name_he || o.name : "");
const orgsOf = (s) => [s.org_id, ...(s.related_ids || [])].filter((id) => ORGS.has(id));
const craftsOfSignal = (s) => new Set(orgsOf(s).flatMap((id) => INDEX.get(id)?.crafts || []));
const seenAt = (s) => (s.added && s.added > s.date ? s.added : s.date); // when it reached us, if later

function orgCard(id, base) {
  const o = ORGS.get(id);
  if (!o) return null;
  return { id, name: name(o), latin: o.name_he ? o.name : null, kind: o.kind, href: `${base}/companies#${encodeURIComponent(id)}`, logo: INDEX.get(id)?.logo || null };
}

const cleanCrafts = (crafts) => [...new Set((crafts || []).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 12);

/**
 * composeDigest({ crafts, topics, days, now, base }) →
 *   { edition, from, to, crafts, items, more, picks, newOrgs, count, empty }
 * items: updates relevant to the crafts (or all, for the general edition); more: other notable updates
 * when the personal list is short; picks: buyers of those crafts with a reason to reach out now.
 */
export function composeDigest({ crafts = [], topics = [], days = 7, now = new Date(), base = siteUrl() } = {}) {
  crafts = cleanCrafts(crafts);
  const types = topics?.length ? new Set(topics.flatMap((t) => TOPIC_TYPES[t] || [])) : null;
  const to = ilDate(now);
  const from = isoOf(new Date(utcDay(to) - days * DAY));
  // News from the period, plus slightly older news that only reached the directory during it.
  const lateLimit = isoOf(new Date(utcDay(from) - 14 * DAY));
  const inWindow = (s) => s.date <= to && (s.date > from || (seenAt(s) > from && s.date > lateLimit));
  const relevant = (s) => !crafts.length || [...craftsOfSignal(s)].some((c) => crafts.includes(c));

  const toItem = (s) => ({
    id: s.id,
    type: s.type,
    label: SIG_LABEL[s.type] || "עדכון",
    headline: s.headline_he,
    why: s.why_he || "",
    date: s.date,
    day: fmtDay(s.date),
    org: orgCard(s.org_id, base) || (s.org_name ? { name: s.org_name } : null),
    source: s.source || "",
    source_url: s.source_url || "",
  });
  const rank = (a, b) => (WEIGHT[b.type] || 0) - (WEIGHT[a.type] || 0) || String(b.date).localeCompare(String(a.date));

  const pool = SIGNALS.filter((s) => inWindow(s) && (!types || types.has(s.type))).sort(rank);
  const mine = pool.filter(relevant);
  const items = mine.slice(0, 8).map(toItem);
  const more = crafts.length && items.length < 4 ? pool.filter((s) => !relevant(s)).slice(0, 4 - items.length).map(toItem) : [];

  // Who commissions these crafts, with a reason to reach out now (a recent update, else their agency).
  const shown = new Set([...items, ...more].map((i) => i.org?.id).filter(Boolean));
  const shownSignals = new Set([...items, ...more].map((i) => i.id));
  const usedSignals = new Set();
  // A recent update about this buyer that isn't already listed above.
  const recent = (id) => SIGNALS.filter((s) => orgsOf(s).includes(id) && !shownSignals.has(s.id) && utcDay(to) - utcDay(s.date) <= 60 * DAY).sort(rank)[0];
  const buyers = index.orgs.filter((o) => BUYER_KINDS.has(o.kind) && !shown.has(o.id) && (!crafts.length || o.crafts.some((c) => crafts.includes(c))));
  const scored = buyers
    .map((o) => ({ o, s: recent(o.id) }))
    .filter((x) => crafts.length || x.s) // the general edition only picks buyers with news
    .sort((a, b) => Number(Boolean(b.s)) - Number(Boolean(a.s)) || (b.s ? rank(a.s, b.s) : 0) || a.o.name.localeCompare(b.o.name));
  const chosen = [];
  for (const x of scored) {
    if (chosen.length >= 5) break;
    if (x.s && usedSignals.has(x.s.id)) x.s = null; // one update explains one pick
    if (!x.s && !crafts.length) continue;
    if (x.s) usedSignals.add(x.s.id);
    chosen.push(x);
  }
  const picks = chosen.map(({ o, s }) => {
    const full = ORGS.get(o.id);
    const agency = full?.client_profile?.known_agencies?.[0];
    const craft = crafts.find((c) => o.crafts.includes(c));
    const reason = s
      ? `${SIG_LABEL[s.type] || "עדכון"}, ${fmtDay(s.date)}: ${s.why_he || s.headline_he}`
      : [o.buys.length ? `מזמינים ${o.buys.slice(0, 3).join(", ")}` : "", agency ? `משרד פרסום: ${agency}` : ""].filter(Boolean).join(" · ");
    return { org: orgCard(o.id, base), craft: craft ? craftLabel(craft) : null, reason };
  });

  // New in the directory during the period, buyers first.
  const added = dataset.orgs.filter((o) => o.added > BASELINE && o.added > from && o.added <= to &&
    (!crafts.length || (INDEX.get(o.id)?.crafts || []).some((c) => crafts.includes(c))));
  added.sort((a, b) => Number(BUYER_KINDS.has(b.kind)) - Number(BUYER_KINDS.has(a.kind)) || a.name.localeCompare(b.name));
  const newOrgs = { total: added.length, list: added.slice(0, 6).map((o) => orgCard(o.id, base)) };

  const count = items.length + picks.length + newOrgs.total;
  return {
    edition: editionOf(now),
    from, to, days,
    crafts: crafts.map((c) => ({ slug: c, he: craftLabel(c) })),
    items, more, picks, newOrgs,
    count,
    empty: items.length === 0 && newOrgs.total === 0,
  };
}

export const craftsTitle = (d) => (d.crafts.length ? d.crafts.slice(0, 3).map((c) => c.he).join(", ") : "");

// A ready LinkedIn post: a hook, three or four items, a link back with UTM tags.
export function linkedinPost(d, base = siteUrl()) {
  const q = d.crafts.length ? `crafts=${d.crafts.map((c) => c.slug).join(",")}&` : "";
  const url = `${base}/digest?${q}utm_source=linkedin&utm_medium=social&utm_campaign=digest-${d.edition}`;
  const top = [...d.items, ...d.more].slice(0, 4);
  const lines = [
    d.crafts.length ? `מה השתנה השבוע אצל מי שמזמין ${craftsTitle(d)}:` : "מה השתנה השבוע בתעשיית הקריאייטיב בישראל:",
    "",
    ...top.map((i) => `• ${i.headline}`),
    ...(d.picks.length && top.length < 4 ? [`• ${d.picks.length} מותגים ומשרדים שכדאי לפנות אליהם עכשיו, ולמה`] : []),
    "",
    "הגיליון המלא, עם הסיבה לפנות עכשיו:",
    url,
  ];
  return lines.join("\n");
}
