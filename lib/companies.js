// Company search index (built by scripts/prebuild.mjs) for site-wide search and the home page numbers. Server only.
// Matching follows the companies app (site/app.html): every word must appear in the company's search text,
// and a craft matches the company's categories or what it buys. So /search, /people and /companies agree on counts.
import data from "@/lib/generated/orgs.json";

import { soundsLike } from "@/lib/translit";
export const STATS = data.stats;
export const ORGS = data.orgs;

export const words = (q) => String(q || "").toLowerCase().split(/\s+/).filter(Boolean);

// Every word must match. If a longer phrase matches nothing that way, the companies matching the most words come
// back instead, marked `loose` so the page can say they're close matches, not exact ones.
export function searchCompanies(q = "", craft = "", kind = "") {
  const terms = words(q);
  if (!terms.length && !craft && !kind) return [];
  const has = (o, t) => o.text.includes(t) || soundsLike(t, o.name);
  const pool = ORGS.filter((o) => (!craft || o.crafts.includes(craft)) && (!kind || o.kind === kind));
  // Name matches first.
  const nameHit = (o) => terms.some((t) => `${o.name} ${o.name_he || ""}`.toLowerCase().includes(t) || soundsLike(t, o.name));
  const hits = pool.filter((o) => terms.every((t) => has(o, t)));
  if (hits.length || terms.length < 2) return hits.sort((a, b) => Number(nameHit(b)) - Number(nameHit(a)));
  const scored = pool.map((o) => [o, terms.filter((t) => t.length > 1 && has(o, t)).length]).filter(([, n]) => n > 0);
  const loose = scored.sort((a, b) => b[1] - a[1] || Number(nameHit(b[0])) - Number(nameHit(a[0]))).map(([o]) => o);
  loose.loose = true;
  return loose;
}

export const companiesWithCraft = (craft) => ORGS.filter((o) => o.crafts.includes(craft)).length;
// Every company has its own page (app/companies/[id]).
export const companyHref = (id) => `/companies/${encodeURIComponent(id)}`;
