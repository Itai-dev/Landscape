// The front page ("בית") and the update pages (/updates, /updates/<id>): the industry's news, composed from
// the published directory (site/data) at request time. Personal when the caller passes the reader's crafts
// and tracked companies; this file never reads per-person data itself. Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import index from "@/lib/generated/orgs.json";
import { SIG_LABEL, classOf, classLabel, signalCrafts } from "@/lib/digest";
import { tendersFor, listTenders } from "@/lib/tenders";
import { fmtDay, todayIL, utcDay } from "@/lib/digestSchedule";
import { craftLabel, CRAFT_SLUGS } from "@/lib/taxonomy";
import { fold } from "@/lib/match";

const DAY = 864e5;
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
const INDEX = new Map(index.orgs.map((o) => [o.id, o]));
const BY_NAME = new Map();
for (const o of index.orgs) for (const n of [o.name, o.name_he]) if (n) BY_NAME.set(fold(n), o);

const ID_RE = /^[a-z0-9][a-z0-9-]{2,80}$/;
const seenAt = (s) => (s.added && s.added > s.date ? s.added : s.date); // when it reached the directory
// Every published update, newest first (by the day it reached us, then by the day it happened).
export const UPDATES = (signalsFile.signals || [])
  .filter((s) => !s.hidden && s.headline_he && s.date && ID_RE.test(String(s.id || "")))
  .sort((a, b) => seenAt(b).localeCompare(seenAt(a)) || String(b.date).localeCompare(String(a.date)));
const BY_ID = new Map(UPDATES.map((s) => [s.id, s]));

export const updatePath = (id) => `/updates/${encodeURIComponent(id)}`;
export const updateById = (id) => BY_ID.get(String(id || "")) || null;

// The front page's sections ("beats"). Jobs are opportunities and never lead; they appear in their own box
// and as a filter on /updates.
export const BEATS = [
  { key: "campaigns", he: "קמפיינים", types: ["campaign", "award"] },
  { key: "people", he: "אנשים ומשרדים", types: ["new_exec", "agency_move"] },
  { key: "money", he: "כסף ועסקאות", types: ["funding", "acquisition", "ownership", "closure"] },
  { key: "launches", he: "השקות ואירועים", types: ["launch", "rebrand"] },
  { key: "jobs", he: "משרות", types: ["hiring"] },
];
export const beatOf = (s) => BEATS.find((b) => b.types.includes(s.type)) || null;
export const beatByKey = (key) => BEATS.find((b) => b.key === key) || null;

// What makes a story lead the front page: how much it changes for the industry, not only whether it leads to
// work (lib/digest.js WEIGHT ranks the email by that). Jobs never lead.
const FRONT_WEIGHT = { agency_move: 6, new_exec: 6, campaign: 5, acquisition: 5, funding: 5, rebrand: 4, launch: 3, award: 3, ownership: 3, closure: 2, hiring: 0 };

const ROLE_HE = {
  agency: "משרד פרסום", production: "הפקה", director: "בימוי", studio: "סטודיו", post: "פוסט־פרודקשן", editor: "עריכה",
  editing: "עריכה", sound: "סאונד", music: "מוזיקה", animation: "אנימציה", vfx: "VFX", color: "קולור", photography: "צילום",
  dop: "צילום", "creative director": "קריאייטיב דירקטור", "art director": "ארט דירקטור", copywriter: "קופירייטינג",
  strategy: "אסטרטגיה", planner: "פלנינג", ai: "AI", "ai director": "בימוי AI",
};

const cleanCrafts = (crafts) => [...new Set((crafts || []).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 12);
const daysSince = (iso, today) => Math.round((utcDay(today) - utcDay(iso)) / DAY);

export function orgCard(id) {
  const o = ORGS.get(id);
  if (!o) return null;
  const i = INDEX.get(id);
  return { id, name: o.name_he || o.name, latin: o.name_he ? o.name : null, kind: o.kind, href: `/companies/${encodeURIComponent(id)}`, logo: i?.logo_hi || null, logo_px: i?.logo_px || null };
}

// The credits as written in the update, each linked to its company page when the name is in the directory.
export function creditsOf(s) {
  const credits = s.credits && typeof s.credits === "object" ? s.credits : {};
  return Object.entries(credits).map(([role, who]) => {
    const o = BY_NAME.get(fold(String(who)));
    return { role, role_he: ROLE_HE[fold(role)] || role, who: String(who), org: o && o.id !== s.org_id ? orgCard(o.id) : null };
  });
}

// Every company an update is about: its subject, the related ones and the credited ones in the directory.
export function orgIdsOf(s) {
  const ids = [s.org_id, ...(s.related_ids || []), ...creditsOf(s).map((c) => c.org?.id)].filter((id) => id && ORGS.has(id));
  return [...new Set(ids)];
}
const isAbout = (s, follows) => follows.size > 0 && orgIdsOf(s).some((id) => follows.has(id));
const inCrafts = (s, crafts) => crafts.length > 0 && [...signalCrafts(s).strong].some((c) => crafts.includes(c));
const nearCrafts = (s, crafts) => crafts.length > 0 && [...signalCrafts(s).loose].some((c) => crafts.includes(c));

// Points for a story: its weight, how fresh it is (by the day it reached us, unless it happened over a month
// ago), whether it explains itself and names people we can link, and, for a signed-in reader, whether it's
// in their crafts or about a company they track.
export function storyScore(s, { crafts = [], follows = new Set(), today }) {
  const age = daysSince(s.date, today) > 30 ? 99 : daysSince(seenAt(s), today);
  const fresh = age <= 2 ? 4 : age <= 4 ? 3 : age <= 7 ? 2 : age <= 14 ? 1 : 0;
  const linked = creditsOf(s).filter((c) => c.org).length;
  let n = (FRONT_WEIGHT[s.type] ?? 1) + fresh + (s.why_he ? 1 : 0) + (ORGS.has(s.org_id) ? 1 : 0) + Math.min(2, linked);
  if (inCrafts(s, crafts)) n += 4;
  else if (nearCrafts(s, crafts)) n += 1;
  if (isAbout(s, follows)) n += 6;
  return n;
}

export function updateItem(s, { crafts = [], follows = new Set() } = {}) {
  const beat = beatOf(s);
  return {
    id: s.id,
    type: s.type,
    label: SIG_LABEL[s.type] || "עדכון",
    class: classOf(s),
    class_label: classLabel(s),
    beat: beat?.key || "",
    beat_he: beat?.he || "",
    headline: s.headline_he,
    why: s.why_he || "",
    date: s.date,
    day: fmtDay(s.date),
    seen: seenAt(s),
    late: seenAt(s) > s.date,
    org: orgCard(s.org_id) || (s.org_name ? { name: s.org_name } : null),
    credits: creditsOf(s),
    related: (s.related_ids || []).map(orgCard).filter(Boolean),
    crafts: [...signalCrafts(s).strong].map((c) => ({ slug: c, he: craftLabel(c) })),
    source: s.source || "",
    source_url: s.source_url || "",
    href: updatePath(s.id),
    mine: inCrafts(s, crafts),
    tracked: isAbout(s, follows),
  };
}

function tenderRow(t) {
  return {
    id: t.id,
    state: t.state,
    label: t.state === "upcoming" ? `${t.kind_he} · ההגשה נפתחת ב־${t.opens.split(" · ")[0]}` : `${t.kind_he} · ${t.countdown.text}`,
    summary: t.scope_summary || t.title,
    buyer: t.buyer_name_he || t.buyer,
    buyer_href: t.buyer_href || null,
    when: t.when,
    urgent: t.countdown.tone === "soon" || t.countdown.tone === "urgent",
    url: t.source_url,
  };
}

/**
 * composeFront({ crafts, follows, now }) →
 *   { dateline, span, lead, tracked, top, beats, tenders, jobs, inTheNews, stats, crafts, personal }
 * lead: the story of the moment; tracked: stories about companies the reader tracks; top: the next stories;
 * beats: the rest by section. Nothing appears twice. Jobs and tenders are the opportunities box.
 */
export function composeFront({ crafts = [], follows = [], now = new Date() } = {}) {
  crafts = cleanCrafts(crafts);
  const followSet = new Set((follows || []).filter((id) => ORGS.has(id)));
  const today = todayIL(now);
  const ctx = { crafts, follows: followSet, today };
  const within = (s, days) => s.date <= today && daysSince(seenAt(s), today) <= days;
  const story = (s) => s.type !== "hiring";
  // The front covers the last two weeks; a quiet fortnight widens to a month, then a quarter, so it never runs empty.
  const span = [14, 30, 90].find((d) => UPDATES.filter((s) => within(s, d) && story(s)).length >= 6) || 90;
  const ranked = UPDATES.filter((s) => within(s, span) && story(s))
    .map((s) => ({ s, n: storyScore(s, ctx) }))
    .sort((a, b) => b.n - a.n || seenAt(b.s).localeCompare(seenAt(a.s)))
    .map((x) => x.s);

  const used = new Set();
  const take = (max, pred = () => true) => {
    const out = [];
    for (const s of ranked) {
      if (out.length >= max) break;
      if (used.has(s.id) || !pred(s)) continue;
      used.add(s.id);
      out.push(updateItem(s, ctx));
    }
    return out;
  };
  const lead = take(1)[0] || null;
  const tracked = followSet.size ? take(4, (s) => isAbout(s, followSet)) : [];
  const top = take(5);
  const beats = BEATS.filter((b) => b.key !== "jobs")
    .map((b) => ({ key: b.key, he: b.he, items: take(3, (s) => b.types.includes(s.type)) }))
    .filter((b) => b.items.length);

  // Opportunities: live tenders in the reader's crafts (all, for a visitor) and published job postings.
  const tenders = tendersFor(crafts, { now, max: 3 }).map(tenderRow);
  const jobs = UPDATES.filter((s) => s.type === "hiring" && s.source_url && within(s, 30))
    .map((s) => ({ s, n: storyScore(s, ctx) }))
    .sort((a, b) => b.n - a.n || seenAt(b.s).localeCompare(seenAt(a.s)))
    .slice(0, 5)
    .map((x) => updateItem(x.s, ctx));

  // Companies in the news: everyone the period's updates are about, most mentioned first.
  const counts = new Map();
  for (const s of UPDATES.filter((s) => within(s, span))) for (const id of orgIdsOf(s)) counts.set(id, (counts.get(id) || 0) + 1);
  const inTheNews = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([id, k]) => ({ ...orgCard(id), updates: k }));

  const live = listTenders({ now });
  const stats = {
    orgs: dataset.orgs.length,
    week: UPDATES.filter((s) => within(s, 7)).length,
    openTenders: live.filter((t) => t.state === "open").length,
    upcomingTenders: live.filter((t) => t.state === "upcoming").length,
    jobs: UPDATES.filter((s) => s.type === "hiring" && s.source_url && within(s, 30)).length,
    addedOrgs: dataset.orgs.filter((o) => o.added && o.added <= today && daysSince(o.added, today) <= 14).length,
  };
  const dateline = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(now);
  return {
    today, dateline, span, lead, tracked, top, beats, tenders, jobs, inTheNews, stats,
    crafts: crafts.map((c) => ({ slug: c, he: craftLabel(c) })),
    personal: crafts.length > 0 || followSet.size > 0,
  };
}

/** The archive (/updates): newest first, optionally one beat and/or the reader's crafts, within `days`. */
export function listUpdates({ beat = "", crafts = [], days = 90, max = 120, now = new Date() } = {}) {
  crafts = cleanCrafts(crafts);
  const today = todayIL(now);
  const b = beatByKey(beat);
  return UPDATES.filter((s) => s.date <= today && daysSince(seenAt(s), today) <= days && (!b || b.types.includes(s.type)) && (!crafts.length || inCrafts(s, crafts)))
    .slice(0, max)
    .map((s) => updateItem(s, { crafts }));
}

/** Other updates about the same companies (newest first), for an update's page. */
export function moreAbout(s, max = 4) {
  const ids = new Set(orgIdsOf(s));
  if (!ids.size) return [];
  return UPDATES.filter((x) => x.id !== s.id && orgIdsOf(x).some((id) => ids.has(id))).slice(0, max).map((x) => updateItem(x));
}

/** Recent updates in the same section, for an update's page (skipping the ones `moreAbout` shows). */
export function relatedUpdates(s, { skip = [], max = 4, now = new Date() } = {}) {
  const b = beatOf(s);
  if (!b) return [];
  const today = todayIL(now);
  const out = new Set([s.id, ...skip]);
  return UPDATES.filter((x) => !out.has(x.id) && b.types.includes(x.type) && daysSince(seenAt(x), today) <= 120).slice(0, max).map((x) => updateItem(x));
}
