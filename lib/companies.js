// Slim company index (built by scripts/prebuild.mjs) for site-wide search and the home page numbers. Server only.
import data from "@/lib/generated/orgs.json";
import { craftLabel } from "@/lib/taxonomy";

export const STATS = data.stats;
export const ORGS = data.orgs;

const fold = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function searchCompanies(q = "", craft = "") {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  const hits = ORGS.filter((o) => {
    if (craft && !o.categories.includes(craft)) return false;
    if (!terms.length) return Boolean(craft);
    const hay = fold([o.name, o.name_he, ...o.aka, o.city, o.about, ...o.categories.map(craftLabel)].join(" "));
    return terms.every((t) => hay.includes(t));
  });
  // Name matches first.
  const nameHit = (o) => terms.some((t) => fold(`${o.name} ${o.name_he || ""}`).includes(t));
  return hits.sort((a, b) => Number(nameHit(b)) - Number(nameHit(a)));
}

export const companyHref = (id) => `/companies#${encodeURIComponent(id)}`;
