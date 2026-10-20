// Runs before `next dev` / `next build`:
// 1. copies the companies app (site/app.html + site/data/*) to public/companies/, served at /companies;
// 2. builds lib/generated/people.json: people already published in the org records (public business roles, with a source);
// 3. builds lib/generated/orgs.json: the company search index, matched the same way as the companies app;
// 4. applies the database migration when a Postgres URL is available (Vercel + Supabase integration).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { migrate } from "./migrate.mjs";
import { headerHtml, footerHtml } from "../lib/chrome.mjs";
import { CLOSES_AT } from "../lib/survey/config.js";

// 1. Companies app. site/app.html is a page body (the Artifact host adds the document shell),
// so here it gets a real shell: doctype (standards mode), charset, phone viewport, Hebrew + RTL.
rmSync("public/map", { recursive: true, force: true });
rmSync("public/companies", { recursive: true, force: true });
mkdirSync("public/companies/data", { recursive: true });
// The header and footer come from the same source as the Next.js pages (lib/chrome.mjs, app/chrome.css).
const between = (s, open, close, put) => {
  const a = s.indexOf(open), b = s.indexOf(close);
  if (a < 0 || b < a) throw new Error(`prebuild: marker ${open} missing in site/app.html`);
  return s.slice(0, a) + put + s.slice(b + close.length);
};
let body = readFileSync("site/app.html", "utf8").replaceAll('fetch("data/', 'fetch("/companies/data/')
  // The survey close date has one source (lib/survey/config.js).
  .replaceAll("__SURVEY_CLOSES_AT__", CLOSES_AT);
body = between(body, "/* chrome:css", "/* /chrome:css */", readFileSync("app/chrome.css", "utf8"));
body = between(body, "<!-- chrome:header -->", "<!-- /chrome:header -->",
  headerHtml("companies", '<button class="langbtn" type="button" id="lang" lang="en">English</button>'));
body = between(body, "<!-- chrome:footer -->", "<!-- /chrome:footer -->", footerHtml());
const shell =
  '<!doctype html>\n<html lang="he" dir="rtl" data-site="">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="theme-color" content="#ffffff">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
  "<script>window.LANDSCAPE_SITE = true;</script>\n";
writeFileSync("public/companies/index.html", shell + body);
cpSync("site/data", "public/companies/data", { recursive: true });
console.log("prebuild: copied the companies app to public/companies");

const dataset = JSON.parse(readFileSync("site/data/dataset.json", "utf8"));
const TAX = dataset.taxonomy;
const NEEDS = dataset.needs || {};
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

// 2. People index. One entry per person (merged across orgs), only roles that are current and were published with a source.
// Research notes in brackets ("per Globes, 2010", "from 2024") move out of the title into `note`.
const NOTE = /\d{4}|\b(per|from|since|until|appointed|credited|joined|globes|post-split|client|oversees|leads|agency producer)\b/i;
const PAST = /\b(died|deceased|passed away|left|former|ex-|retired|until)\b|לשעבר|ז["״]ל|נפטר|\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b/i;
const slug = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9֐-׿]+/g, "-").replace(/^-|-$/g, "");
function splitRole(raw) {
  const notes = [];
  const role = String(raw || "").replace(/\s*\(([^)]*)\)/g, (m, inner) => (NOTE.test(inner) ? (notes.push(inner.trim()), "") : m)).replace(/\s{2,}/g, " ").trim();
  // "Production (agency producer)": the note is the real title.
  if (/^production$/i.test(role) && notes.length === 1 && /producer/i.test(notes[0])) return { role: notes[0].replace(/^./, (c) => c.toUpperCase()), note: null };
  return { role, note: notes.join("; ") || null };
}
const people = new Map();
let dropped = 0;
for (const o of dataset.orgs) {
  if (o.status === "closed") continue;
  for (const p of o.key_people || []) {
    const name = (p.name || "").trim();
    const source = p.source || (o.sources || [])[0];
    if (!name || !source) continue;
    // Former and deceased role-holders, and people known only from LinkedIn, are not listed.
    if (PAST.test(p.role || "") || /(^|\.)linkedin\.com$/.test(host(source))) { dropped++; continue; }
    const id = slug(name);
    if (!id) continue;
    const { role, note } = splitRole(p.role);
    const entry = people.get(id) || { id, name, roles: [] };
    entry.roles.push({
      role,
      note: p.note || note,
      role_type: p.role_type || "other",
      org_id: o.id,
      org: o.name,
      org_he: o.name_he || null,
      org_kind: o.kind,
      crafts: o.categories || [],
      city: o.location?.city || null,
      source,
      // Only the date the role itself was published. The org's last check is not a date for the person.
      as_of: p.as_of || null,
    });
    people.set(id, entry);
  }
}
mkdirSync("lib/generated", { recursive: true });
// Most recently published first; within a month, a stable shuffle so one company doesn't fill the first page.
const latest = (p) => p.roles.map((r) => r.as_of || "").sort().pop().slice(0, 7);
const mix = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return h; };
const list = [...people.values()].sort((a, b) => latest(b).localeCompare(latest(a)) || mix(a.id) - mix(b.id));
writeFileSync("lib/generated/people.json", JSON.stringify({ generated: dataset.generated, people: list }));
console.log(`prebuild: ${list.length} people from public sources (${dropped} former, deceased or LinkedIn-only roles left out)`);

// 3. Company index. `text` is built exactly like the companies app's search text (site/app.html, index()),
// and `crafts` adds the crafts implied by what a company buys, so /search and /companies count the same.
const KIND_NAMES = {
  studio: "Studio סטודיו", production_company: "Production co. חברת הפקות", startup: "Startup סטארטאפ",
  agency: "Agency סוכנות", client: "Brand מותג", community: "Community קהילה",
};
const searchText = (o) => [o.name, o.name_he, (o.aka || []).join(" "), o.description, o.description_he, o.location?.city, TAX.cities_he?.[o.location?.city], KIND_NAMES[o.kind] || "",
  (o.categories || []).map((c) => TAX.categories[c] + " " + (TAX.categories_he?.[c] || "")).join(" "),
  (o.needs || []).map((n) => NEEDS[n]?.label + " " + (NEEDS[n]?.label_he || "")).join(" "),
  (o.client_profile?.creative_needs || []).join(" "), (o.client_profile?.known_agencies || []).join(" "),
  (o.services || []).join(" "), (o.notable_clients || []).join(" "), (o.notable_work || []).join(" "),
  (o.tags || []).join(" "), (o.key_people || []).map((p) => p.name + " " + p.role).join(" ")].join(" ").toLowerCase();
const craftsOf = (o) => [...new Set([...(o.categories || []), ...(o.needs || []).flatMap((n) => NEEDS[n]?.crafts || [])])];

const signals = JSON.parse(readFileSync("site/data/signals.json", "utf8")).signals || [];
const logos = JSON.parse(readFileSync("site/data/logos.json", "utf8"));
const orgs = dataset.orgs.map((o) => ({
  id: o.id,
  name: o.name,
  name_he: o.name_he || null,
  kind: o.kind,
  city: o.location?.city || null,
  categories: o.categories || [],
  crafts: craftsOf(o),
  buys: (o.needs || []).map((n) => NEEDS[n]?.label_he || NEEDS[n]?.label).filter(Boolean),
  text: searchText(o),
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

// 4. Database.
await migrate();
