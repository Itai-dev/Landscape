// The agent (/agent, test version): the directory turned around. Instead of a database people search, the
// agent reads a one-line intro, works out who the reader is and what they do, and hands back a briefing:
// what changed for them, why it matters, and what they can do about it. Built from site/data only, with rules,
// no AI call per person, so a reader costs nothing (the sources are scanned once, for everyone). Server only.
import signalsFile from "@/site/data/signals.json";
import dataset from "@/site/data/dataset.json";
import index from "@/lib/generated/orgs.json";
import taxonomy from "@/schema/taxonomy.json";
import needsFile from "@/schema/needs.json";
import { CRAFT_SLUGS, craftLabel } from "@/lib/taxonomy";
import { fold } from "@/lib/match";
import { classOf, classLabel, signalCrafts, composeDigest, fmtDay } from "@/lib/digest";
import { listTenders } from "@/lib/tenders";

const DAY = 864e5;
const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && s.headline_he);
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
const INDEX = new Map(index.orgs.map((o) => [o.id, o]));
export const WINDOW_DAYS = 60;

// --- Who the reader is ----------------------------------------------------------------------------------------
export const ROLES = [
  { slug: "studio", he: "סטודיו, משרד או חברת הפקה", short: "סטודיו" },
  { slug: "freelance", he: "פרילנס", short: "פרילנס" },
  { slug: "brand", he: "צד המותג (שיווק)", short: "צד המותג" },
];
export const ROLE_SLUGS = ROLES.map((r) => r.slug);
export const roleOf = (slug) => ROLES.find((r) => r.slug === slug) || ROLES[0];

// What they want most right now, by role.
export const GOALS = {
  studio: [{ slug: "clients", he: "לקוחות חדשים" }, { slug: "tenders", he: "מכרזים" }, { slug: "market", he: "מה קורה אצל אחרים בשוק" }],
  freelance: [{ slug: "work", he: "עבודה ופרויקטים" }, { slug: "tenders", he: "מכרזים" }, { slug: "market", he: "מה קורה בתחום" }],
  brand: [{ slug: "suppliers", he: "ספקים ואנשים" }, { slug: "market", he: "מה המתחרים עושים" }],
};

const ROLE_WORDS = {
  studio: ["סטודיו", "סטודיואים", "משרד", "משרד פרסום", "סוכנות", "חברת הפקה", "חברת הפקות", "בית הפקה", "בית הפקות", "הפקות", "studio", "agency", "production company", "צוות", "שותפים"],
  freelance: ["פרילנס", "פרילנסר", "פרילנסרית", "עצמאי", "עצמאית", "freelance", "freelancer", "לבד", "באופן עצמאי"],
  brand: ["מותג", "מנהל שיווק", "מנהלת שיווק", "סמנכל שיווק", "סמנכלית שיווק", "שיווק", "marketing", "brand manager", "cmo", "צד הלקוח", "in house", "אין האוס"],
};
// Craft names, their Hebrew and the common aliases (schema/taxonomy.json), plus a few everyday words.
const EXTRA = {
  "graphic-design": ["גרפיקה", "גרפיקאי", "גרפיקאית", "מעצב גרפי", "מעצבת גרפית", "עיצוב"],
  branding: ["מיתוג", "זהות", "לוגו", "לוגואים"],
  "motion-design": ["מושן", "אנימציות", "מושן גרפיקס"],
  "commercial-production": ["פרסומות", "הפקת פרסומות", "הפקה", "הפקות"],
  "film-production": ["סרטים", "קולנוע", "דוקו"],
  photography: ["צילום", "צלם", "צלמת", "סטילס"],
  editing: ["עריכה", "עורך", "עורכת", "עריכת וידאו"],
  copywriting: ["קופי", "קופירייטינג", "קופירייטר", "קופירייטרית", "כתיבה"],
  "content-studio": ["תוכן", "סושיאל", "רשתות", "סטודיו תוכן"],
  "digital-design": ["ux", "ui", "אתרים", "אפליקציות", "דיגיטל"],
  illustration: ["איור", "מאייר", "מאיירת"],
  "ai-creative": ["ai", "בינה מלאכותית", "ג'נרטיבי"],
  "sound-design": ["סאונד", "מיקס"],
  "music-production": ["מוזיקה", "ג'ינגלים"],
  packaging: ["אריזות", "אריזה"],
  "cgi-3d": ["תלת ממד", "3d", "הדמיות"],
};
const CRAFT_WORDS = CRAFT_SLUGS.map((slug) => [slug, [...new Set([taxonomy.categories?.[slug], taxonomy.categories_he?.[slug], ...(taxonomy.craft_aliases?.[slug] || []), ...(EXTRA[slug] || [])]
  .filter(Boolean).map(fold))]]);
const LATIN_SHORT = /^[a-z0-9 ]{1,4}$/;
function hasWord(text, w) {
  if (LATIN_SHORT.test(w)) return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text);
  // Hebrew: the word, or the word with a one-letter prefix (ל, ב, ו, ה, ש, מ)
  return new RegExp(`(^|\\s)ו?([לבהשמ])?${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text);
}

/** "סטודיו למושן ומיתוג בתל אביב" → { role: "studio", crafts: ["motion-design", "branding"] } */
export function readIntro(text) {
  const t = ` ${fold(text)} `;
  let role = "", best = 0;
  for (const [slug, words] of Object.entries(ROLE_WORDS)) {
    const n = words.filter((w) => hasWord(t, fold(w))).length;
    if (n > best) { best = n; role = slug; }
  }
  const crafts = CRAFT_WORDS.filter(([, words]) => words.some((w) => w && hasWord(t, w))).map(([slug]) => slug);
  // "עיצוב" alone is too broad once a more specific design craft was named.
  const out = crafts.includes("graphic-design") && crafts.some((c) => ["branding", "digital-design", "motion-design", "packaging"].includes(c)) && !/גרפי/.test(t)
    ? crafts.filter((c) => c !== "graphic-design") : crafts;
  return { role, crafts: out.slice(0, 6) };
}

// --- The briefing -------------------------------------------------------------------------------------------
// How much each kind of update matters to each role (bigger = higher in the briefing).
const ROLE_WEIGHT = {
  studio: { agency_move: 10, new_exec: 10, rebrand: 9, funding: 8, launch: 7, acquisition: 6, ownership: 6, campaign: 5, award: 4, hiring: 3, closure: 2 },
  freelance: { hiring: 10, campaign: 6, launch: 6, rebrand: 6, funding: 5, new_exec: 5, agency_move: 5, award: 3, acquisition: 3, ownership: 3, closure: 2 },
  brand: { campaign: 10, award: 8, agency_move: 7, rebrand: 7, launch: 6, new_exec: 4, funding: 3, acquisition: 3, ownership: 3, hiring: 2, closure: 2 },
};
const GOAL_BOOST = {
  clients: { agency_move: 3, new_exec: 3, rebrand: 2, funding: 2, launch: 2 },
  work: { hiring: 4, launch: 1, rebrand: 1 },
  market: { campaign: 4, award: 3, acquisition: 2 },
  suppliers: { campaign: 3, award: 2 },
};

// Why an update may matter, by role. A business signal, never written as proof that anyone is hiring or commissioning.
const WHY = {
  studio: {
    agency_move: "כשמותג מחליף משרד, לא פעם מתחלפים גם הספקים סביבו. זה זמן טוב להכיר את המותג ואת המשרד החדש.",
    new_exec: "מינוי חדש בשיווק הוא לא פעם הזדמנות להיכנס כספק: אנשים חדשים בונים צוות ספקים משלהם.",
    rebrand: "מיתוג מחדש מושך אחריו עבודה: יישום, תוכן, מושן וסושיאל.",
    funding: "חברות שגייסו כסף נוטות להשקיע אחרי הגיוס בשיווק ובמותג.",
    launch: "השקה צריכה חומרים: וידאו, עיצוב ותוכן.",
    acquisition: "שינוי בעלות מביא לא פעם בדיקה מחדש של המותג ושל הספקים.",
    ownership: "שינוי בעלות מביא לא פעם בדיקה מחדש של המותג ושל הספקים.",
    campaign: "ככה נראית העבודה בשוק עכשיו: מי הזמין, ומי עשה.",
    award: "מי זוכה עכשיו, ועל איזו עבודה.",
    hiring: "מגייסים לתפקיד קריאייטיב בתוך החברה: סימן שיש שם עבודה בתחום.",
    closure: "שינוי בשוק ששווה לדעת עליו.",
  },
  freelance: {
    hiring: "משרה פתוחה, עם קישור למודעה עצמה.",
    campaign: "מי הזמין ומי עשה: ככה נראית העבודה בשוק עכשיו.",
    launch: "השקה צריכה חומרים: וידאו, עיצוב ותוכן.",
    rebrand: "מיתוג מחדש מושך אחריו עבודה: יישום, תוכן, מושן וסושיאל.",
    funding: "חברות שגייסו כסף נוטות להשקיע אחרי הגיוס בשיווק ובמותג.",
    new_exec: "מינוי חדש בשיווק הוא לא פעם הזדמנות להציג את עצמכם.",
    agency_move: "כשמותג מחליף משרד, לא פעם מתחלפים גם הספקים סביבו.",
  },
  brand: {
    campaign: "מה מותגים אחרים מוציאים עכשיו, ומי עשה את זה בשבילם.",
    award: "העבודות שזוכות עכשיו, ומי עומד מאחוריהן.",
    agency_move: "מי עבר לאיזה משרד: שווה לדעת מי עובד עם מי.",
    rebrand: "מי מתחדש בשוק, ואיך.",
    launch: "מה מושק עכשיו בשוק.",
    new_exec: "מי נכנס לתפקיד בשיווק אצל אחרים.",
  },
};
const whyFor = (role, type) => WHY[role]?.[type] || WHY.studio[type] || "עדכון מהשוק ששווה לדעת עליו.";

const hebrewList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ו${xs[xs.length - 1]}`);
const orgOf = (id) => {
  const o = ORGS.get(id), x = INDEX.get(id);
  if (!o) return null;
  return { id, name: o.name_he || o.name, kind: o.kind, href: `/companies/${encodeURIComponent(id)}`, logo: x?.logo_hi || null, logo_px: x?.logo_px || null };
};
const daysAgo = (iso, now) => Math.max(0, Math.round((now - Date.parse(iso)) / DAY));

// --- What the map knows: the part a general AI agent doesn't have ------------------------------------------
// Relations, what each brand commissions, who handles its marketing, which studios already worked with it, and
// its history in the directory. All from the published directory, each fact as it was recorded there.
const NEEDS = needsFile.needs || {};
const MAKERS = new Set(["studio", "production_company", "startup"]);
const nm = (id) => { const o = ORGS.get(id); return o ? o.name_he || o.name : ""; };
const BY_FOLD = new Map();
for (const o of dataset.orgs) for (const n of [o.name, o.name_he, ...(o.aka || [])]) if (n) BY_FOLD.set(fold(n), o.id);
const AGENCY_CLIENTS = new Map(), WORKED_WITH = new Map(), SIGNALS_OF = new Map();
const add = (m, k, v) => { if (!k || !v || k === v) return; if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
for (const o of dataset.orgs) {
  for (const r of o.relations || []) {
    if (!r.target_id || !ORGS.has(r.target_id)) continue;
    if (r.type === "agency" && o.kind === "client") add(AGENCY_CLIENTS, r.target_id, o.id);
    if (r.type === "client" && ORGS.get(o.id).kind === "agency") add(AGENCY_CLIENTS, o.id, r.target_id);
    if (r.type === "client" && MAKERS.has(o.kind)) add(WORKED_WITH, r.target_id, o.id);
  }
  if (MAKERS.has(o.kind)) for (const c of o.notable_clients || []) add(WORKED_WITH, BY_FOLD.get(fold(c)), o.id);
}
for (const sg of SIGNALS) for (const id of [sg.org_id, ...(sg.related_ids || [])]) { if (!SIGNALS_OF.has(id)) SIGNALS_OF.set(id, []); SIGNALS_OF.get(id).push(sg); }
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const monthOf = (iso) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : "");
const some = (ids, n = 3) => { const xs = [...ids].map(nm).filter(Boolean); return xs.length > n ? `${xs.slice(0, n).join(", ")} ועוד ${xs.length - n}` : xs.join(", "); };

/** Facts the map holds about a company, most useful first: [{ k, v, href?, mine? }] */
export function mapFacts(id, { crafts = [], role = "studio", skip = null, now = Date.now() } = {}) {
  const o = ORGS.get(id);
  if (!o) return [];
  const out = [];
  const person = (o.key_people || []).find((p) => p.role_type === "marketing") || (o.kind === "agency" ? (o.key_people || []).find((p) => p.role_type === "creative_lead") : null);
  if (person && person.source) out.push({ k: o.kind === "agency" ? "בקריאייטיב" : "בשיווק", v: `${person.name}, ${person.role}${person.as_of ? ` (נכון ל${monthOf(person.as_of)})` : ""}`, href: person.source });
  const needs = (o.needs || []).map((n) => NEEDS[n]).filter(Boolean);
  if (needs.length) {
    const mine = needs.filter((n) => (n.crafts || []).some((c) => crafts.includes(c)));
    out.push({ k: "מה הם מזמינים", v: (mine.length ? [...mine, ...needs.filter((n) => !mine.includes(n))] : needs).slice(0, 4).map((n) => n.label_he || n.label).join(", "), mine: mine.length ? mine.map((n) => n.label_he || n.label).slice(0, 2).join(" ו") : "" });
  }
  if (o.kind === "client") {
    const ag = (o.relations || []).filter((r) => r.type === "agency" && r.target_id && ORGS.has(r.target_id)).map((r) => r.target_id);
    if (ag.length) out.push({ k: "משרדי פרסום", v: some(ag) });
  }
  if (o.kind === "agency" && AGENCY_CLIENTS.get(id)?.size) out.push({ k: "לקוחות של המשרד", v: some(AGENCY_CLIENTS.get(id), 4) });
  const makers = WORKED_WITH.get(id);
  if (makers?.size && role !== "brand") out.push({ k: "סטודיואים והפקות שכבר עבדו איתם", v: some(makers) });
  const past = (SIGNALS_OF.get(id) || []).filter((x) => x.id !== skip && Date.parse(x.date) <= now).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (past) out.push({ k: `קודם לכן (${monthOf(past.date)})`, v: past.headline_he.length > 110 ? past.headline_he.slice(0, 108).replace(/\s+\S*$/, "") + "…" : past.headline_he, href: past.source_url || null });
  return out.slice(0, 4);
}

// For an agency move: the other agency in the deal and who else it works with.
function dealFacts(s) {
  const out = [];
  for (const id of s.related_ids || []) {
    const o = ORGS.get(id);
    if (!o || o.kind !== "agency") continue;
    const cl = [...(AGENCY_CLIENTS.get(id) || [])].filter((c) => c !== s.org_id);
    if (cl.length) out.push({ k: `${nm(id)} עובדים גם עם`, v: some(cl, 4) });
  }
  return out.slice(0, 2);
}

// For a tender: who already works with the buyer, from the directory's own updates about it.
function tenderFacts(t) {
  if (!t.buyer_org_id) return [];
  const sigs = (SIGNALS_OF.get(t.buyer_org_id) || []).sort((a, b) => b.date.localeCompare(a.date));
  const ids = new Set(sigs.flatMap((x) => x.related_ids || []).filter((id) => ORGS.has(id) && id !== t.buyer_org_id));
  const loose = [];
  for (const c of sigs.flatMap((x) => Object.values(x.credits || {}).map(String))) { const id = BY_FOLD.get(fold(c)); if (id) ids.add(id); else if (!loose.includes(c)) loose.push(c); }
  const names = [...[...ids].map(nm), ...loose].filter(Boolean);
  const out = [];
  if (names.length) out.push({ k: `עובדים היום עם ${nm(t.buyer_org_id) || "הגוף המזמין"}`, v: names.slice(0, 4).join(", ") });
  if (sigs[0]) out.push({ k: `העדכון האחרון (${monthOf(sigs[0].date)})`, v: sigs[0].headline_he.length > 110 ? sigs[0].headline_he.slice(0, 108).replace(/\s+\S*$/, "") + "…" : sigs[0].headline_he, href: sigs[0].source_url || null });
  return out;
}

// Google Calendar link for a tender's deadline (no account, no cost).
function calendarLink(t) {
  const end = new Date(t.deadline_utc), start = new Date(end.getTime() - 60 * 60 * 1000);
  const f = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: `הגשה: ${t.title}`, dates: `${f(start)}/${f(end)}`, details: `${t.buyer_name_he || t.buyer}\n${t.source_url}`, ctz: "Asia/Jerusalem" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/**
 * composeBrief({ role, crafts, goals, follows, now }) → { stats, opportunities, updates, companies, missions }
 * opportunities: open tenders and job postings with a source (the only things called opportunities);
 * updates: business signals ranked for the role, each with why it may matter and what to do next.
 */
export function composeBrief({ role = "studio", crafts = [], goals = [], follows = [], now = new Date() } = {}) {
  role = ROLE_SLUGS.includes(role) ? role : "studio";
  crafts = [...new Set((crafts || []).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 8);
  goals = (goals || []).filter((g) => GOAL_BOOST[g] || g === "tenders");
  const followSet = new Set((follows || []).filter((id) => ORGS.has(id)).slice(0, 100));
  const nowMs = now.getTime();
  const inWindow = SIGNALS.filter((s) => daysAgo(s.date, nowMs) <= WINDOW_DAYS && Date.parse(s.date) <= nowMs);
  const strong = (s) => [...signalCrafts(s).strong].filter((c) => crafts.includes(c));
  const loose = (s) => [...signalCrafts(s).loose].some((c) => crafts.includes(c));
  const followed = (s) => followSet.has(s.org_id) || (s.related_ids || []).some((id) => followSet.has(id));

  // Opportunities: open tenders in the reader's crafts (all live ones for a studio with none), and job postings.
  const live = listTenders({ now });
  const tenderPool = role === "brand" ? [] : (crafts.length ? live.filter((t) => t.crafts.some((c) => crafts.includes(c))) : role === "studio" ? live : []);
  const tenders = tenderPool.slice(0, goals.includes("tenders") ? 4 : 3).map((t) => ({
    kind: "tender", id: t.id, state: t.state,
    label: t.state === "open" ? "הזדמנות · מכרז פתוח" : "מכרז · ההגשה עוד לא נפתחה",
    title: t.title, summary: t.scope_summary, buyer: t.buyer_name_he || t.buyer, buyer_href: t.buyer_href,
    when: t.when, countdown: t.countdown.text, urgent: t.countdown.tone === "soon" || t.countdown.tone === "urgent",
    crafts: t.crafts_he.filter((c) => !crafts.length || crafts.includes(c.slug)).map((c) => c.he).slice(0, 3),
    source: t.source, source_url: t.source_url, calendar: t.state !== "cancelled" ? calendarLink(t) : null,
    facts: tenderFacts(t),
  }));
  const wantJobs = role === "freelance" || goals.includes("work");
  const jobs = wantJobs
    ? inWindow.filter((s) => s.type === "hiring" && classOf(s) === "opportunity" && (!crafts.length || strong(s).length || loose(s)))
      .sort((a, b) => strong(b).length - strong(a).length || b.date.localeCompare(a.date)).slice(0, 3)
    : [];
  const opportunities = [
    ...tenders,
    ...jobs.map((s) => ({
      kind: "job", id: s.id, label: classLabel(s), title: s.headline_he, summary: s.why_he || "", day: fmtDay(s.date),
      org: orgOf(s.org_id) || (s.org_name ? { name: s.org_name } : null), crafts: strong(s).map(craftLabel).slice(0, 3),
      source: s.source || "", source_url: s.source_url || "",
      facts: mapFacts(s.org_id, { crafts, role, skip: s.id, now: nowMs }).slice(0, 3),
    })),
  ];
  const usedJobs = new Set(jobs.map((s) => s.id));

  // Updates: ranked for this reader.
  const w = ROLE_WEIGHT[role];
  const score = (s) => (w[s.type] || 1) + goals.reduce((n, g) => n + (GOAL_BOOST[g]?.[s.type] || 0), 0) +
    (strong(s).length ? 5 : loose(s) ? 2 : 0) + (followed(s) ? 8 : 0) - daysAgo(s.date, nowMs) * 0.06;
  const ranked = inWindow.filter((s) => !usedJobs.has(s.id) && !(role !== "freelance" && !goals.includes("work") && s.type === "hiring" && !strong(s).length))
    .map((s) => ({ s, k: score(s) })).sort((a, b) => b.k - a.k);
  const seenOrgs = new Map();
  const updates = [];
  for (const { s } of ranked) {
    if (updates.length >= 6) break;
    const n = seenOrgs.get(s.org_id) || 0;
    if (n >= 2) continue; // no more than two about one company
    seenOrgs.set(s.org_id, n + 1);
    const mine = strong(s).map(craftLabel);
    const known = mapFacts(s.org_id, { crafts, role, skip: s.id, now: nowMs });
    const facts = s.type === "agency_move" ? [...known.filter((f) => f.k !== "משרדי פרסום").slice(0, 2), ...dealFacts(s)].slice(0, 4) : known;
    // the reason, made specific: what this company commissions that the reader does
    const fit = facts.find((f) => f.mine)?.mine;
    updates.push({
      id: s.id, type: s.type, label: classLabel(s), class: classOf(s), headline: s.headline_he, context: s.why_he || "", day: fmtDay(s.date),
      org: orgOf(s.org_id) || (s.org_name ? { name: s.org_name } : null),
      followed: followed(s),
      why: whyFor(role, s.type) + (fit && role !== "brand" ? ` בין מה ש${nm(s.org_id)} מזמינים: ${fit}, בדיוק מה שאתם עושים.` : ""),
      facts,
      fit: fit || "",
      crafts: mine.slice(0, 2),
      source: s.source || "", source_url: s.source_url || "",
      // an outreach draft makes sense where there is a company to write to and the reader sells to it
      draft: role !== "brand" && Boolean(orgOf(s.org_id)) && ["agency_move", "new_exec", "rebrand", "funding", "launch", "acquisition", "ownership", "campaign"].includes(s.type),
    });
  }

  // Companies that commission the reader's crafts (the digest's picks), for a studio or a freelancer.
  const companies = role === "brand" || !crafts.length ? [] : (composeDigest({ crafts, days: 30, maxItems: 0, maxPicks: 4, maxTenders: 0, follows: [...followSet] }).picks || [])
    .filter((p) => p.org?.id).map((p) => ({ org: { id: p.org.id, name: p.org.name, kind: p.org.kind, href: `/companies/${encodeURIComponent(p.org.id)}`, logo: p.org.logo_hi || null, logo_px: p.org.logo_px || null }, reason: p.reason || "", detail: p.detail || "" }));

  // What the agent keeps doing, in plain words.
  const cr = crafts.length ? hebrewList(crafts.slice(0, 3).map(craftLabel)) : "";
  const missions = [
    { live: true, text: "התדריך הזה מתעדכן בכל כניסה, מתוך המקורות שאנחנו בודקים. כל פרט נבדק מול המקור." },
    role !== "brand" && { live: true, text: `מכרזים${cr ? ` ב${cr}` : ""} מסומנים בתדריך עם מועד ההגשה` },
    { live: true, text: `המייל השבועי ביום ראשון בבוקר${cr ? `, לפי ${cr}` : ""} (בהרשמה)` },
    { live: true, text: followSet.size ? `התראה במייל כשמשהו זז אצל ${followSet.size === 1 ? "החברה" : `${followSet.size} החברות`} שבמעקב (בהרשמה)` : "התראה במייל כשמשהו זז אצל חברה שבמעקב (בהרשמה)" },
    { live: false, text: role === "studio" ? "התראה מיידית לטלפון כשמותג מחליף משרד או ממנה מנהל שיווק" : role === "freelance" ? "התראה מיידית לטלפון על משרה חדשה בתחום שלכם" : "התראה מיידית לטלפון על קמפיין חדש של מתחרה" },
  ].filter(Boolean);

  const sources = new Set(inWindow.map((s) => s.source).filter(Boolean));
  for (const t of live) if (t.source) sources.add(t.source);
  return {
    stats: { signals: inWindow.length, tenders: live.length, orgs: dataset.orgs.length, sources: sources.size, days: WINDOW_DAYS },
    profile: { role, role_he: roleOf(role).short, crafts: crafts.map((c) => ({ slug: c, he: craftLabel(c) })), goals },
    opportunities, updates, companies, missions,
    count: opportunities.length + updates.length + companies.length,
  };
}
