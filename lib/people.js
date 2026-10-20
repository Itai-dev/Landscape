// People already published in the company records (public business roles, each with a source).
// Built by scripts/prebuild.mjs into lib/generated/people.json. Server only.
import data from "@/lib/generated/people.json";
import { craftLabel } from "@/lib/taxonomy";

export const SEEDS = data.people;
const BY_ID = new Map(SEEDS.map((p) => [p.id, p]));
export const seedById = (id) => BY_ID.get(String(id || "")) || null;

export const ROLE_TYPES = [
  { slug: "founder", he: "מייסדים" },
  { slug: "executive", he: "הנהלה" },
  { slug: "creative_lead", he: "קריאייטיב" },
  { slug: "production", he: "הפקה" },
  { slug: "marketing", he: "שיווק" },
];
export const roleTypeLabel = (slug) => ROLE_TYPES.find((r) => r.slug === slug)?.he || "";

const KIND_HE = { studio: "סטודיו", production_company: "חברת הפקה", startup: "סטארטאפ", agency: "סוכנות", client: "מותג", community: "קהילה" };
export const kindLabel = (k) => KIND_HE[k] || "";
export const orgLabel = (r) => r.org_he || r.org;

const fold = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

// Search by name, role, company (English or Hebrew name) and the company's crafts.
export function searchSeeds({ q = "", craft = "", role = "", exclude = new Set() } = {}) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  return SEEDS.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (craft && !p.roles.some((r) => r.crafts.includes(craft))) return false;
    if (role && !p.roles.some((r) => r.role_type === role)) return false;
    if (!terms.length) return true;
    const hay = fold([p.name, ...p.roles.flatMap((r) => [r.role, r.org, r.org_he, r.city, ...r.crafts.map(craftLabel)])].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}
