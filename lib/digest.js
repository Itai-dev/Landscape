// "השבוע בתעשייה": the digest, composed from the published directory (site/data) only.
// No per-person data here: callers pass the crafts and topics a reader chose. Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import index from "@/lib/generated/orgs.json";
import needsFile from "@/schema/needs.json";
import { CRAFT_SLUGS, craftLabel } from "@/lib/taxonomy";
import { fold } from "@/lib/match";
import { tendersFor } from "@/lib/tenders";
import {
  PERIOD_DAYS, editionOf, dueFor, fmtDay, fmtRange, todayIL, utcDay, isoOf, periodOf, frequencyOfDays,
} from "@/lib/digestSchedule";

export { PERIOD_DAYS, editionOf, dueFor, fmtDay, fmtRange };

const DAY = 864e5;
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
const INDEX = new Map(index.orgs.map((o) => [o.id, o]));
const BY_NAME = new Map();
for (const o of index.orgs) for (const n of [o.name, o.name_he]) if (n) BY_NAME.set(fold(n), o);
const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && s.headline_he);
// The directory as it stood when the digest launched is the starting map, not "added this week".
const BASELINE_DATE = "2026-10-20";

export const SIG_LABEL = {
  new_exec: "מינוי בשיווק", agency_move: "החלפת משרד", campaign: "קמפיין", hiring: "משרה", funding: "גיוס הון",
  launch: "השקה", rebrand: "מיתוג מחדש", acquisition: "רכישה", ownership: "בעלות", award: "פרס", closure: "סגירה",
};

// Opportunity or update. An opportunity is something you can act on as published: a job posting (with its
// source) here, and open tenders (lib/tenders.js). Every other type is a business signal that might create
// demand; it is never shown as proof that a company is hiring or commissioning work.
const OPPORTUNITY_TYPES = new Set(["hiring"]);
export const classOf = (s) => (OPPORTUNITY_TYPES.has(s.type) && s.source_url ? "opportunity" : "update");
export const CLASS_HE = { opportunity: "הזדמנות", update: "עדכון" };
/** "הזדמנות · משרה", "עדכון · מינוי בשיווק" */
export const classLabel = (s) => `${CLASS_HE[classOf(s)]} · ${SIG_LABEL[s.type] || "כללי"}`;
// The heading for the relevance line: why it might matter, never a promise.
export const WHY_HE = "למה זה רלוונטי";
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
const MAKER_KINDS = new Set(["studio", "production", "startup"]);

export const MAX_ITEMS = 5; // email: updates per edition
export const MAX_PICKS = 3;
export const MAX_TENDERS = 3;

export function siteUrl() {
  const u = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "landscape-ten-phi.vercel.app";
  return (u.startsWith("http") ? u : `https://${u}`).replace(/\/$/, "");
}

// --- Which crafts an update is about ----------------------------------------------------------------------
// Words in the update itself (headline, why, credits). Short Latin terms match whole words only.
const TERMS = {
  "motion-design": ["מושן", "motion"],
  "animation-2d": ["אנימציה", "אנימציית", "אנימטור", "הנפשה", "הנפשת", "animation", "animator", "2d", "concept artist"],
  "animation-3d": ["אנימציה", "אנימציית", "אנימטור", "הנפשה", "הנפשת", "animation", "animator", "3d animation", "אנימציית דמויות"],
  "cgi-3d": ["cgi", "3d", "תלת ממד", "הדמיה", "הדמיות"],
  vfx: ["vfx", "אפקטים", "visual effects", "compositing"],
  "post-production": ["פוסט מלא", "פוסט פרודקשן", "post production", "postproduction"],
  "color-grading": ["קולור", "color grading", "colorist"],
  editing: ["עריכה", "עריכת", "עורך", "עורכת", "עורכים", "editor", "editing"],
  "sound-design": ["סאונד", "sound", "audio", "מיקס"],
  "music-production": ["מוזיקה", "מוזיקלי", "לצלילי", "ג'ינגל", "jingle", "music"],
  branding: ["מיתוג", "זהות חדש", "זהות חזותית", "לוגו", "branding", "brand identity", "brand designer"],
  "graphic-design": ["עיצוב גרפי", "גרפיקה", "graphic design", "graphic designer"],
  illustration: ["איור", "איורים", "מאייר", "illustration", "illustrator"],
  "digital-design": ["ux", "ui", "product designer", "עיצוב דיגיטלי", "web design"],
  "creative-technology": ["creative tech", "קריאייטיב טק", "אינטראקטיב", "interactive"],
  experiential: ["מיצב", "אירוע", "experiential"],
  xr: ["ar", "vr", "xr", "מציאות רבודה", "מציאות מדומה"],
  "game-art": ["concept artist", "game art", "ארט למשחק", "unity"],
  "game-development": ["משחקי", "משחק מובייל", "משחקים", "gaming", "unity"],
  "film-production": ["קולנוע", "סדרת רשת", "סדרה", "series", "film"],
  "commercial-production": ["פרסומת", "הפקה", "הבמאי", "במאי", "בימוי", "commercial"],
  "content-studio": ["תוכן", "סושיאל", "content", "social", "סדרת רשת"],
  photography: ["צילום", "צלם", "פאקשוט", "packshot", "photography"],
  "ai-creative": ["ai", "בינה מלאכותית", "genai", "generative", "ג'נרטיבי"],
  packaging: ["אריזה", "אריזות", "packaging", "מותג פרטי"],
  typography: ["טיפוגרפיה", "פונט", "typography", "type design"],
};
// Credit roles → crafts they hire.
const CREDIT_CRAFTS = {
  production: ["commercial-production", "film-production"],
  director: ["commercial-production"],
  // "studio" alone says nothing about the craft: the credited studio's own crafts are used (below).
  post: ["post-production", "editing", "color-grading"],
  editor: ["editing"], editing: ["editing"],
  sound: ["sound-design"], music: ["music-production"],
  animation: ["animation-2d", "animation-3d", "motion-design"],
  vfx: ["vfx"], color: ["color-grading"], photography: ["photography"], dop: ["commercial-production"],
};
// Update types that are about the brand's look itself.
const TYPE_CRAFTS = { rebrand: ["branding", "graphic-design"] };

const LATIN_SHORT = /^[a-z0-9 ]{1,5}$/;
const TERM_RES = Object.entries(TERMS).map(([craft, words]) => [
  craft,
  words.map((w) => {
    const f = fold(w);
    if (LATIN_SHORT.test(f)) return new RegExp(`(^|[^a-z0-9])${f.replace(/ /g, " ")}([^a-z0-9]|$)`);
    return f;
  }),
]);
// Need label (Hebrew or English) → crafts, for "what they commission" and loose matches.
const NEEDS = needsFile.needs || {};
const NEED_BY_LABEL = new Map();
for (const n of Object.values(NEEDS)) for (const l of [n.label, n.label_he]) if (l) NEED_BY_LABEL.set(l, n);

const signalCache = new Map();
// { strong, loose }: strong = the update names the craft (or credits someone in it); loose = it's the kind
// of job that tends to need it (from schema/needs.json). Only strong matches count as "in your crafts".
export function signalCrafts(s) {
  if (signalCache.has(s.id)) return signalCache.get(s.id);
  const strong = new Set(TYPE_CRAFTS[s.type] || []);
  const credits = s.credits && typeof s.credits === "object" ? s.credits : {};
  // "בלי סאונד" / "without sound" is not about sound: negated words are dropped before matching.
  const text = fold([s.headline_he, s.why_he, s.headline, s.why, ...Object.keys(credits)].join(" "))
    .replace(/(^|[^a-z0-9א-ת])(בלי|ללא|without|no)\s+\S+/g, "$1");
  for (const [craft, terms] of TERM_RES) if (terms.some((t) => (typeof t === "string" ? text.includes(t) : t.test(text)))) strong.add(craft);
  for (const [role, who] of Object.entries(credits)) {
    for (const c of CREDIT_CRAFTS[fold(role)] || []) strong.add(c);
    const o = BY_NAME.get(fold(String(who)));
    if (o && MAKER_KINDS.has(o.kind)) for (const c of o.crafts || []) strong.add(c);
  }
  const loose = new Set();
  const en = ` ${fold([s.headline, s.why].join(" "))} `;
  for (const n of Object.values(NEEDS)) if ((n.match || []).some((m) => en.includes(fold(m)))) for (const c of n.crafts || []) loose.add(c);
  for (const id of [s.org_id, ...(s.related_ids || [])]) {
    const o = INDEX.get(id);
    if (o && MAKER_KINDS.has(o.kind)) for (const c of o.crafts || []) loose.add(c);
  }
  const out = { strong, loose };
  signalCache.set(s.id, out);
  return out;
}

// What a buyer commissions that fits a craft, in their own "buys" words.
function buysFor(o, craft) {
  return (o.buys || []).filter((label) => {
    const n = NEED_BY_LABEL.get(label);
    return !craft || !n || (n.crafts || []).includes(craft);
  });
}

// --- Composition -----------------------------------------------------------------------------------------
const name = (o) => (o ? o.name_he || o.name : "");
const seenAt = (s) => (s.added && s.added > s.date ? s.added : s.date); // when it reached us, if later

function orgCard(id, base) {
  const o = ORGS.get(id);
  if (!o) return null;
  return { id, name: name(o), latin: o.name_he ? o.name : null, kind: o.kind, href: `${base}/companies#${encodeURIComponent(id)}`, logo: INDEX.get(id)?.logo || null };
}

const cleanCrafts = (crafts) => [...new Set((crafts || []).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 12);
const hebrewList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ו${xs[xs.length - 1]}`);

/**
 * composeDigest({ crafts, topics, days, now, base, since, maxItems, maxPicks }) →
 *   { edition, from, to, range, period, crafts, items, more, picks, added, count, empty }
 * items: updates that are about the chosen crafts (or all, for the general edition); more: other notable
 * updates to fill the edition; picks: buyers of those crafts with a reason to reach out now;
 * added: companies added to the directory since `since` (a reader's last edition).
 */
export function composeDigest({ crafts = [], topics = [], days = 7, now = new Date(), base = siteUrl(), since = null, maxItems = MAX_ITEMS, maxPicks = MAX_PICKS, maxTenders = MAX_TENDERS } = {}) {
  crafts = cleanCrafts(crafts);
  const period = periodOf(frequencyOfDays(days));
  const types = topics?.length ? new Set(topics.flatMap((t) => TOPIC_TYPES[t] || [])) : null;
  const to = todayIL(now);
  const from = isoOf(new Date(utcDay(to) - days * DAY));
  // News from the period, plus slightly older news that only reached the directory during it.
  const lateLimit = isoOf(new Date(utcDay(from) - 14 * DAY));
  const inWindow = (s) => s.date <= to && (s.date > from || (seenAt(s) > from && s.date > lateLimit));
  const mineStrong = (s) => [...signalCrafts(s).strong].some((c) => crafts.includes(c));
  const mineLoose = (s) => [...signalCrafts(s).loose].some((c) => crafts.includes(c));

  const toItem = (s) => ({
    id: s.id,
    type: s.type,
    label: SIG_LABEL[s.type] || "עדכון",
    class: classOf(s),
    class_label: classLabel(s),
    headline: s.headline_he,
    why: s.why_he || "",
    date: s.date,
    day: fmtDay(s.date),
    late: s.date <= from, // published earlier, reached the directory in this period
    org: orgCard(s.org_id, base) || (s.org_name ? { name: s.org_name } : null),
    source: s.source || "",
    source_url: s.source_url || "",
  });
  const rank = (a, b) => (WEIGHT[b.type] || 0) - (WEIGHT[a.type] || 0) || String(b.date).localeCompare(String(a.date));

  const pool = SIGNALS.filter((s) => inWindow(s) && (!types || types.has(s.type))).sort(rank);
  let items, more;
  if (crafts.length) {
    items = pool.filter(mineStrong).slice(0, maxItems).map(toItem);
    // Fill the edition: loosely related updates first, then the period's most useful ones.
    const rest = pool.filter((s) => !mineStrong(s)).sort((a, b) => Number(mineLoose(b)) - Number(mineLoose(a)) || rank(a, b));
    more = rest.slice(0, Math.max(0, Math.min(3, maxItems - items.length))).map(toItem);
  } else {
    items = pool.slice(0, maxItems).map(toItem);
    more = [];
  }

  // Who commissions these crafts, with a reason to reach out now (a recent update, else what they buy).
  const shown = new Set([...items, ...more].map((i) => i.org?.id).filter(Boolean));
  const shownSignals = new Set([...items, ...more].map((i) => i.id));
  const usedSignals = new Set();
  // Only updates where the buyer is the subject (not one it's merely mentioned in) explain a pick.
  const recent = (id) => SIGNALS.filter((s) => s.org_id === id && !shownSignals.has(s.id) && utcDay(to) - utcDay(s.date) <= 60 * DAY).sort(rank)[0];
  const craftOf = (o) => crafts.find((c) => o.crafts.includes(c));
  const buyers = index.orgs.filter((o) => BUYER_KINDS.has(o.kind) && !shown.has(o.id) &&
    (!crafts.length || (craftOf(o) && buysFor(o, craftOf(o)).length)));
  const scored = buyers
    .map((o) => ({ o, s: recent(o.id) }))
    .filter((x) => crafts.length || x.s) // the general edition only picks buyers with news
    .sort((a, b) => Number(Boolean(b.s)) - Number(Boolean(a.s)) || (b.s ? rank(a.s, b.s) : 0) || a.o.name.localeCompare(b.o.name));
  const chosen = [];
  for (const x of scored) {
    if (chosen.length >= maxPicks) break;
    if (x.s && usedSignals.has(x.s.id)) x.s = null; // one update explains one pick
    if (!x.s && !crafts.length) continue;
    if (x.s) usedSignals.add(x.s.id);
    chosen.push(x);
  }
  const picks = chosen.map(({ o, s }) => {
    const craft = craftOf(o);
    const buys = buysFor(o, craft).slice(0, 2);
    const agency = ORGS.get(o.id)?.client_profile?.known_agencies?.[0];
    const news = s ? `${SIG_LABEL[s.type] || "עדכון"}, ${fmtDay(s.date)}: ${s.why_he || s.headline_he}` : "";
    const commission = buys.length ? `מזמינים ${hebrewList(buys)}` : "";
    return {
      org: orgCard(o.id, base),
      // The craft tag only helps when the reader chose several.
      craft: crafts.length > 1 && craft ? craftLabel(craft) : null,
      // Personal editions lead with what they commission in the reader's craft; then why now.
      reason: crafts.length ? commission || news : news || commission,
      detail: crafts.length ? (commission ? news : "") : news ? commission : "",
      agency: agency || null,
    };
  });

  // Added to the directory since the reader's last edition (or the start of the period), buyers first.
  const after = [since, from, BASELINE_DATE].filter(Boolean).sort().pop();
  const addedList = dataset.orgs.filter((o) => o.added && o.added > after && o.added <= to &&
    (!crafts.length || (INDEX.get(o.id)?.crafts || []).some((c) => crafts.includes(c))));
  addedList.sort((a, b) => Number(BUYER_KINDS.has(b.kind)) - Number(BUYER_KINDS.has(a.kind)) || a.name.localeCompare(b.name));
  const added = { total: addedList.length, list: addedList.length > 15 ? [] : addedList.slice(0, 6).map((o) => orgCard(o.id, base)) };

  // Tenders in the reader's crafts (all in the general edition): open ones first (soonest deadline), then
  // published ones whose submission window hasn't opened yet. `state` tells them apart; only "open" is open.
  const tenders = tendersFor(crafts, { now, max: maxTenders }).map((t) => ({
    id: t.id,
    state: t.state,
    label: t.state === "upcoming" ? "מכרז · ההגשה עוד לא נפתחה" : "הזדמנות · מכרז פתוח",
    summary: t.scope_summary,
    title: t.title,
    buyer: t.buyer_name_he || t.buyer,
    buyer_href: t.buyer_href ? `${base}${t.buyer_href}` : null,
    deadline: t.deadline,
    opens: t.opens || "",
    when: t.when,
    published: t.published_at || "",
    countdown: t.countdown.text,
    urgent: t.countdown.tone === "soon" || t.countdown.tone === "urgent",
    url: t.source_url,
  }));
  const openTenders = tenders.filter((t) => t.state === "open").length;

  return {
    edition: editionOf(now),
    from, to, days,
    range: fmtRange(from, to),
    period,
    crafts: crafts.map((c) => ({ slug: c, he: craftLabel(c) })),
    items, more, picks, added, tenders, openTenders,
    count: items.length + more.length + picks.length + tenders.length,
    // Nothing worth an email: no updates and no live (open or upcoming) tender in the reader's crafts.
    empty: items.length === 0 && more.length === 0 && tenders.length === 0,
  };
}

export const craftsTitle = (d) => (d.crafts.length ? hebrewList(d.crafts.slice(0, 3).map((c) => c.he)) : "");

// A ready LinkedIn post: a hook, three or four items, a link back with UTM tags.
export function linkedinPost(d, base = siteUrl()) {
  const q = d.crafts.length ? `crafts=${d.crafts.map((c) => c.slug).join(",")}&` : "";
  const url = `${base}/digest?${q}utm_source=linkedin&utm_medium=social&utm_campaign=digest-${d.edition}`;
  const top = [...d.items, ...d.more].slice(0, 4);
  const lines = [
    d.crafts.length && d.items.length ? `${d.period.since} אצל מי שמזמין ${craftsTitle(d)}:` : `${d.period.since} בתעשיית הקריאייטיב בישראל:`,
    "",
    ...top.map((i) => `• ${i.headline}`),
    ...(d.openTenders && top.length < 4 ? [`• ${d.openTenders === 1 ? "מכרז פתוח להגשה" : `${d.openTenders} מכרזים פתוחים להגשה`}: ${d.tenders.find((t) => t.state === "open").summary}`] : []),
    ...(d.picks.length && top.length < 3 ? [`• ${d.picks.length} מותגים ומשרדים שמזמינים עבודה בתחום, ומה חדש אצלם`] : []),
    "",
    "כל העדכונים, עם המקור ולמה זה רלוונטי:",
    url,
  ];
  return lines.join("\n");
}
