// People already published in the company records (public business roles, each with a source).
// Built by scripts/prebuild.mjs into lib/generated/people.json. Server only.
import data from "@/lib/generated/people.json";
import { craftLabel } from "@/lib/taxonomy";
import { kindLabelHe } from "@/lib/kinds.mjs";
import { fold, terms as words, termsMatch } from "@/lib/match";

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

export const kindLabel = (k) => kindLabelHe(k);
export const orgLabel = (r) => r.org_he || r.org;

// Titles are shown as published (often English, which is how they're used in Israel: CEO, VP Marketing, Co-founder),
// except for loanwords that Hebrew already uses as they are and that don't mark gender.
const LOANWORDS = {
  "creative director": "קריאייטיב דיירקטור",
  "executive creative director": "קריאייטיב דיירקטור ראשי",
  "art director": "ארט דיירקטור",
  "head of productions": "ראש ההפקות",
  "head of production": "ראש ההפקה",
};
export const roleHe = (role = "") => LOANWORDS[String(role).trim().toLowerCase()] || null;

// Search by name, title (as published, Hebrew title words map to it: "מנכ״ל" finds "CEO"), company and the company's crafts.
export function searchSeeds({ q = "", craft = "", role = "", exclude = new Set() } = {}) {
  const ts = words(q);
  return SEEDS.filter((p) => {
    if (exclude.has(p.id)) return false;
    if (craft && !p.roles.some((r) => r.crafts.includes(craft))) return false;
    if (role && !p.roles.some((r) => r.role_type === role)) return false;
    if (!ts.length) return true;
    const hay = fold([p.name, ...p.roles.flatMap((r) => [r.role, roleHe(r.role), roleTypeLabel(r.role_type), r.org, r.org_he, r.city, ...r.crafts.map(craftLabel)])].join(" "));
    return termsMatch(ts, hay);
  });
}
