// Company pages (/companies/<id>): everything the companies app's company sheet shows (site/app.html, openOrg()),
// computed on the server from the published data (site/data). Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import { classLabel, classOf, SIG_LABEL } from "@/lib/digest";
import { fmtDay } from "@/lib/digestSchedule";
import { craftLabel } from "@/lib/taxonomy";
import { kindLabelHe } from "@/lib/kinds.mjs";

const TAX = dataset.taxonomy;
const NEEDS = dataset.needs || {};
export const ORG_LIST = dataset.orgs;
const BY_ID = new Map(ORG_LIST.map((o) => [o.id, o]));
export const orgById = (id) => BY_ID.get(String(id || "")) || null;

// A company's page. Relative by default; pass a base (siteUrl()) for emails and absolute links.
export const orgPath = (id, base = "") => `${base}/companies/${encodeURIComponent(id)}`;

// Same name matching as the companies app (site/app.html: norm, lookup).
const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(ltd|inc|israel|group|studios?|productions?|tel aviv|tlv|the)\b/g, "").replace(/[^a-z0-9֐-׿]+/g, "");
const BY_NAME = new Map();
for (const o of ORG_LIST) {
  if (!BY_NAME.has(norm(o.name))) BY_NAME.set(norm(o.name), o);
  if (o.name_he && !BY_NAME.has(norm(o.name_he))) BY_NAME.set(norm(o.name_he), o);
  for (const a of o.aka || []) if (!BY_NAME.has(norm(a))) BY_NAME.set(norm(a), o);
}
function lookup(name) {
  if (!name) return undefined;
  const n = String(name), inner = n.match(/\(([^)]+)\)/);
  return BY_ID.get(n) || BY_NAME.get(norm(n)) || BY_NAME.get(norm(n.replace(/\s*\([^)]*\)\s*/g, " "))) || (inner ? BY_NAME.get(norm(inner[1])) : undefined);
}

// Who points at whom (clients, agencies, other relations), for "איך להגיע אליהם".
const REV = { clientOf: new Map(), agencyOf: new Map(), rel: new Map() };
const push = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);
for (const o of ORG_LIST) {
  for (const c of o.notable_clients || []) { const x = lookup(c); if (x && x !== o) push(REV.clientOf, x.id, o); }
  for (const a of o.client_profile?.known_agencies || []) { const x = lookup(a); if (x && x !== o) push(REV.agencyOf, x.id, o); }
  for (const r of o.relations || []) { const x = r.target_id ? BY_ID.get(r.target_id) : lookup(r.target); if (x && x !== o) push(REV.rel, x.id, { org: o, type: r.type }); }
}

export const orgName = (o) => o.name_he || o.name;
export const cityHe = (c) => (c && TAX.cities_he?.[c]) || c || "";
export const needLabel = (n) => NEEDS[n]?.label_he || NEEDS[n]?.label || n;
export const confidenceHe = (c) => ({ high: "גבוהה", medium: "בינונית", low: "נמוכה" })[c] || c || "";
export const STATUS_HE = { acquired: "נרכש", closed: "נסגר", merged: "מוזג", unknown: "סטטוס לא ידוע" };

export function sizeHe(s) {
  if (!s) return "";
  const n = (x) => Number(x).toLocaleString("he-IL");
  const num = s.endsWith("+") ? `יותר מ־⁦${n(Number.parseInt(s, 10) - 1)}⁩` : `⁦${s.split("-").map(n).join("–")}⁩`;
  return `${num} עובדים`;
}

// The hi-res logo served with the companies app, never shown above its native size (logo_px).
export const logoOf = (o) => (o.logo_ext ? { src: `/companies/data/logo/${encodeURIComponent(o.id)}.${o.logo_ext}`, px: o.logo_px || 96, wide: (o.logo_ar || 1) >= 1.8 } : null);

const LINK_LABEL = { linkedin: "LinkedIn", instagram: "Instagram", behance: "Behance", vimeo: "Vimeo", youtube: "YouTube", crunchbase: "Crunchbase", x: "X", twitter: "X", facebook: "Facebook", imdb: "IMDb", dribbble: "Dribbble", tiktok: "TikTok", github: "GitHub" };
// Official channels only (the company's own pages): contact first. No emails or phone numbers.
export function reachLinks(o) {
  return [
    o.contact_url && { label: "יצירת קשר", href: o.contact_url, type: "contact" },
    o.careers_url && { label: "דרושים", href: o.careers_url, type: "careers" },
    o.reel_url && { label: "שואוריל", href: o.reel_url, type: "reel" },
    ...Object.entries(o.links || {}).map(([k, v]) => ({ label: LINK_LABEL[k] || k, href: v, type: k })),
  ].filter(Boolean);
}

export function facts(o) {
  const f = o.funding;
  return [
    ["נוסד", o.founded],
    ["גודל", sizeHe(o.size)],
    ["סטטוס", o.status && o.status !== "active" ? STATUS_HE[o.status] || o.status : ""],
    ["מימון", f && [f.public ? `נסחרת בבורסה${f.ticker ? ` (${f.ticker})` : ""}` : f.stage, f.total_usd_m ? `גיוס: ${f.total_usd_m} מיליון $` : ""].filter(Boolean).join(" · ")],
    ["משרדים", (o.location?.other_offices || []).join(", ")],
  ].filter(([, v]) => v);
}

const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && (s.headline_he || s.headline)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
// Updates about this company, newest first, each with its classification and source.
export function updatesFor(o, max = 6) {
  return SIGNALS.filter((s) => s.org_id === o.id || (s.related_ids || []).includes(o.id)).slice(0, max).map((s) => ({
    id: s.id || `${s.org_id}-${s.date}-${s.type}`,
    type: s.type,
    cls: classOf(s),
    label: classLabel(s),
    typeLabel: SIG_LABEL[s.type] || "עדכון",
    day: s.date ? fmtDay(s.date) : "",
    headline: s.headline_he || s.headline,
    why: s.why_he || "",
    source: s.source || "",
    source_url: s.source_url || "",
  }));
}

// "איך להגיע אליהם": the same groups as the companies app, as data. Orgs found in the directory link to their
// page; other names stay plain text. People come only from the published list (`people` = those not hidden).
export function waysIn(o, people = []) {
  const groups = [];
  const seen = new Set([o.id]);
  const take = (arr) => arr.filter((x) => x && !seen.has(x.id) && (seen.add(x.id), true));
  const split = (names) => {
    const inDir = [], out = [];
    for (const n of names) { const x = lookup(n); if (x && x.id !== o.id) inDir.push(x); else out.push(n); }
    return [inDir, out];
  };
  const add = (title, orgs, plain = []) => { if (orgs.length || plain.length) groups.push({ title, orgs: orgs.map(chip), plain }); };

  const agNames = [...(o.client_profile?.known_agencies || []), ...(o.relations || []).filter((r) => r.type === "agency").map((r) => r.target_id || r.target)];
  if (agNames.length) { const [m, p] = split([...new Set(agNames)]); add("המשרד שלהם", take(m), p); }
  add("עבדו בשבילם", take([...(REV.clientOf.get(o.id) || []), ...(REV.rel.get(o.id) || []).filter((r) => r.type === "client").map((r) => r.org)]));
  add("מותגים שעובדים איתם", take([...(REV.agencyOf.get(o.id) || []), ...(REV.rel.get(o.id) || []).filter((r) => r.type === "agency").map((r) => r.org)]));
  const clientNames = [...(o.notable_clients || []), ...(o.relations || []).filter((r) => r.type === "client").map((r) => r.target_id || r.target)];
  if (clientNames.length) { const [m, p] = split([...new Set(clientNames)]); add("הלקוחות שלהם", take(m), p.slice(0, 12)); }
  const mine = new Set((o.notable_clients || []).map(norm));
  if (mine.size) add("לקוחות משותפים עם", take(ORG_LIST.filter((x) => x.id !== o.id && !seen.has(x.id) && (x.notable_clients || []).some((c) => mine.has(norm(c))))).slice(0, 10));
  const famTypes = ["parent", "subsidiary", "acquired", "acquired_by", "partner", "spun_off_from", "investor"];
  const fam = (o.relations || []).filter((r) => famTypes.includes(r.type));
  const famRev = (REV.rel.get(o.id) || []).filter((r) => famTypes.includes(r.type)).map((r) => r.org);
  if (fam.length || famRev.length) { const [m, p] = split(fam.map((r) => r.target_id || r.target)); add("קבוצה ועסקאות", take([...m, ...famRev]), p); }
  if (people.length) groups.push({ title: "אנשים בתפקידים פומביים", people });
  return groups;
}

const chip = (x) => ({ id: x.id, name: orgName(x), latin: x.name_he ? x.name : null, kind: x.kind, logo: logoOf(x), href: orgPath(x.id) });

// Six companies like this one: same kind first, then the most shared crafts (and what they buy).
export function similarTo(o, max = 6) {
  const mine = new Set([...(o.categories || []), ...(o.needs || [])]);
  return ORG_LIST.filter((x) => x.id !== o.id && x.status !== "closed")
    .map((x) => ({ x, s: (x.kind === o.kind ? 3 : 0) + [...(x.categories || []), ...(x.needs || [])].filter((c) => mine.has(c)).length + (x.logo_ext ? 0.2 : 0) }))
    .filter(({ s }) => s > 3)
    .sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name))
    .slice(0, max)
    .map(({ x }) => ({ ...chip(x), city: cityHe(x.location?.city), kindLabel: kindLabelHe(x.kind), line: x.description_he || x.description || "" }));
}

export const craftLinks = (o) => (o.categories || []).map((c) => ({ slug: c, label: craftLabel(c) }));
export const descOf = (o) => ({ text: o.description_he || o.description || "", english: !o.description_he && Boolean(o.description) });
