// Runs before `next dev` / `next build`:
// 1. copies the companies app (site/app.html + site/data/*) to public/companies/, served at /companies;
// 2. builds lib/generated/people.json: people already published in the org records (public business roles, with a source);
// 3. applies the database migration when a Postgres URL is available (Vercel + Supabase integration).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { migrate } from "./migrate.mjs";

// 1. Companies app. On this site its data lives under /companies/data/, and it shows the site's top bar.
rmSync("public/map", { recursive: true, force: true });
rmSync("public/companies", { recursive: true, force: true });
mkdirSync("public/companies/data", { recursive: true });
const app = readFileSync("site/app.html", "utf8")
  .replaceAll('fetch("data/', 'fetch("/companies/data/')
  .replace("<title>", '<script>window.LANDSCAPE_SITE = true;</script>\n<title>');
writeFileSync("public/companies/index.html", app);
cpSync("site/data", "public/companies/data", { recursive: true });
console.log("prebuild: copied the companies app to public/companies");

// 2. People index. One entry per person (merged across orgs), only fields that were published with a source.
const dataset = JSON.parse(readFileSync("site/data/dataset.json", "utf8"));
const slug = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9֐-׿]+/g, "-").replace(/^-|-$/g, "");
const people = new Map();
for (const o of dataset.orgs) {
  if (o.status === "closed") continue;
  for (const p of o.key_people || []) {
    const name = (p.name || "").trim();
    const source = p.source || (o.sources || [])[0];
    if (!name || !source) continue;
    const id = slug(name);
    if (!id) continue;
    const entry = people.get(id) || { id, name, roles: [] };
    entry.roles.push({
      role: p.role || "",
      role_type: p.role_type || "other",
      org_id: o.id,
      org: o.name,
      org_he: o.name_he || null,
      org_kind: o.kind,
      crafts: o.categories || [],
      city: o.location?.city || null,
      source,
      as_of: p.as_of || o.last_verified || null,
    });
    people.set(id, entry);
  }
}
mkdirSync("lib/generated", { recursive: true });
// Most recently verified first; within a month, a stable shuffle so one company doesn't fill the first page.
const latest = (p) => p.roles.map((r) => r.as_of || "").sort().pop().slice(0, 7);
const mix = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h; };
const list = [...people.values()].sort((a, b) => latest(b).localeCompare(latest(a)) || mix(a.id) - mix(b.id));
writeFileSync("lib/generated/people.json", JSON.stringify({ generated: dataset.generated, people: list }));
console.log(`prebuild: ${list.length} people from public sources`);

// Slim company index for site-wide search and the home page numbers.
const signals = JSON.parse(readFileSync("site/data/signals.json", "utf8")).signals || [];
const logos = JSON.parse(readFileSync("site/data/logos.json", "utf8"));
const orgs = dataset.orgs
  .filter((o) => o.status !== "closed")
  .map((o) => ({
    id: o.id,
    name: o.name,
    name_he: o.name_he || null,
    aka: o.aka || [],
    kind: o.kind,
    city: o.location?.city || null,
    categories: o.categories || [],
    about: (o.description_he || o.description || "").slice(0, 180),
    logo: logos[o.id] || null,
  }));
const count = (...kinds) => dataset.orgs.filter((o) => kinds.includes(o.kind)).length;
const stats = {
  orgs: dataset.orgs.length,
  makers: count("studio", "production_company"),
  buyers: count("client", "agency"),
  startups: count("startup"),
  signals: signals.length,
  people: list.length,
};
writeFileSync("lib/generated/orgs.json", JSON.stringify({ stats, orgs }));
console.log(`prebuild: ${orgs.length} companies indexed for search`);

// 3. Database.
await migrate();
