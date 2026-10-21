// Company search index (built by scripts/prebuild.mjs) for site-wide search and the home page numbers. Server only.
// Matching follows the companies app (site/app.html): every word must appear in the company's search text,
// and a craft matches the company's categories or what it buys. So /search, /people and /companies agree on counts.
import data from "@/lib/generated/orgs.json";

import { soundsLike } from "@/lib/translit";
export const STATS = data.stats;
export const ORGS = data.orgs;

export const words = (q) => String(q || "").toLowerCase().split(/\s+/).filter(Boolean);

export function searchCompanies(q = "", craft = "") {
  const terms = words(q);
  if (!terms.length && !craft) return [];
  const hits = ORGS.filter((o) => (!craft || o.crafts.includes(craft)) && terms.every((t) => o.text.includes(t) || soundsLike(t, o.name)));
  // Name matches first.
  const nameHit = (o) => terms.some((t) => `${o.name} ${o.name_he || ""}`.toLowerCase().includes(t) || soundsLike(t, o.name));
  return hits.sort((a, b) => Number(nameHit(b)) - Number(nameHit(a)));
}

export const companiesWithCraft = (craft) => ORGS.filter((o) => o.crafts.includes(craft)).length;
export const companyHref = (id) => `/companies#${encodeURIComponent(id)}`;
