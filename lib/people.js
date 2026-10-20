// People already published in the company records (public business roles, each with a source).
// Built by scripts/prebuild.mjs into lib/generated/people.json. Server only.
import data from "@/lib/generated/people.json";
import { craftLabel } from "@/lib/taxonomy";

export const SEEDS = data.people;
const BY_ID = new Map(SEEDS.map((p) => [p.id, p]));
export const seedById = (id) => BY_ID.get(String(id || "")) || null;

export const ROLE_TYPES = [
  { slug: "founder", he: "ייסוד" },
  { slug: "executive", he: "הנהלה" },
  { slug: "creative_lead", he: "קריאייטיב" },
  { slug: "production", he: "הפקה" },
  { slug: "marketing", he: "שיווק" },
];
export const roleTypeLabel = (slug) => ROLE_TYPES.find((r) => r.slug === slug)?.he || "";

const KIND_HE = { studio: "סטודיו", production_company: "חברת הפקה", startup: "סטארטאפ", agency: "סוכנות", client: "מותג", community: "קהילה" };
export const kindLabel = (k) => KIND_HE[k] || "";
export const orgLabel = (r) => r.org_he || r.org;

// Hebrew for titles that have a gender-neutral industry form. Anything else stays as published (often English,
// which is how these titles are used in Israel: CEO, VP Marketing, Co-founder).
const EXACT = {
  "creative director": "קריאייטיב דיירקטור",
  "art director": "ארט דיירקטור",
  "executive creative director": "קריאייטיב דיירקטור ראשי",
  "general management": "הנהלה כללית",
  "production": "הפקה",
  "agency producer": "הפקה במשרד הפרסום",
  "spokesperson": "דוברות",
  "studio manager": "ניהול הסטודיו",
  "marketing manager": "ניהול שיווק",
  "marketing communications manager": "ניהול תקשורת שיווקית",
  "sound designer": "עיצוב סאונד",
  "brand director": "ניהול מותג",
};
const HEAD_OF = {
  marketing: "השיווק", "marketing division": "חטיבת השיווק", "marketing communications": "התקשורת השיווקית",
  "marketing & digital division": "חטיבת השיווק והדיגיטל", "brand & marketing communications": "המותג והתקשורת השיווקית",
  productions: "ההפקות", production: "ההפקה", "sound design": "עיצוב הסאונד", compositing: "הקומפוזיטינג",
  "tv content": "תוכן הטלוויזיה", "film & tv department": "מחלקת הקולנוע והטלוויזיה", "the commercial department": "מחלקת הפרסומות",
  "format division": "חטיבת הפורמטים", "features and drama division": "חטיבת הדרמה והקולנוע", "snacks division": "חטיבת החטיפים",
};
export function roleHe(role = "") {
  const r = role.trim();
  const low = r.toLowerCase();
  if (EXACT[low]) return EXACT[low];
  const head = low.match(/^head of (.+)$/);
  if (head && HEAD_OF[head[1]]) return `ראש ${HEAD_OF[head[1]]}`;
  const mm = r.match(/^marketing manager, (.+)$/i);
  if (mm) return `ניהול שיווק, ${mm[1]}`;
  return null;
}

const fold = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

// Search by name, role (as published and in Hebrew), company (English or Hebrew name) and the company's crafts.
export function searchSeeds({ q = "", craft = "", role = "", exclude = new Set() } = {}) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  return SEEDS.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (craft && !p.roles.some((r) => r.crafts.includes(craft))) return false;
    if (role && !p.roles.some((r) => r.role_type === role)) return false;
    if (!terms.length) return true;
    const hay = fold([p.name, ...p.roles.flatMap((r) => [r.role, roleHe(r.role), roleTypeLabel(r.role_type), r.org, r.org_he, r.city, ...r.crafts.map(craftLabel)])].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}
