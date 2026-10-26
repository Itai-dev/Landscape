// List export for premium: companies and key people from the published directory (site/data), as CSV that
// Excel opens in Hebrew (UTF-8 with BOM). Only public business information that is already on the site, with
// its source. Pure functions; the route checks premium. Server only.
import dataset from "@/site/data/dataset.json";
import peopleFile from "@/lib/generated/people.json";
import { orgName, cityHe, sizeHe, orgPath } from "@/lib/orgs";
import { kindLabelHe } from "@/lib/kinds.mjs";

const TAX = dataset.taxonomy;
const catHe = (c) => TAX.categories_he?.[c] || c;
const ORGS = dataset.orgs.filter((o) => o.status !== "closed");

// A cell Excel won't run as a formula, quoted when it holds a comma, quote or line break.
export function cell(v) {
  let s = Array.isArray(v) ? v.join(", ") : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

export const EXPORT_KINDS = ["companies", "people"];
const pick = (v) => (typeof v === "string" && v ? v : "");

/** filters: { kind, city, category, ids } (ids: only these companies, e.g. the person's tracking list) */
export function companyRows({ kind = "", city = "", category = "", ids = null } = {}, base = "") {
  const only = ids ? new Set(ids) : null;
  const list = ORGS.filter((o) => (!only || only.has(o.id)) && (!kind || o.kind === kind) && (!city || o.location?.city === city) && (!category || (o.categories || []).includes(category)));
  const head = ["שם", "סוג", "תחומים", "עיר", "גודל", "אתר", "LinkedIn", "עמוד ב־CreativeIn"];
  return [head, ...list.map((o) => [
    orgName(o), kindLabelHe(o.kind), (o.categories || []).map(catHe), cityHe(o.location?.city), sizeHe(o.size),
    o.website || "", o.links?.linkedin || "", orgPath(o.id, base),
  ])];
}

/** People already listed on the site (key_people with a source), one row per role. */
export function peopleRows({ kind = "", city = "", category = "", ids = null } = {}) {
  const only = ids ? new Set(ids) : null;
  const rows = [];
  for (const p of peopleFile.people || []) {
    for (const r of p.roles || []) {
      if (!r.source) continue;
      if (only && !only.has(r.org_id)) continue;
      if (kind && r.org_kind !== kind) continue;
      if (city && r.city !== city) continue;
      if (category && !(r.crafts || []).includes(category)) continue;
      rows.push([p.name, r.role, r.org_he || r.org, kindLabelHe(r.org_kind), cityHe(r.city), r.source, r.as_of || ""]);
    }
  }
  return [["שם", "תפקיד", "חברה", "סוג חברה", "עיר", "מקור", "נכון ל־"], ...rows];
}

export function exportCsv(type, filters = {}, base = "") {
  const f = { kind: pick(filters.kind), city: pick(filters.city), category: pick(filters.category), ids: filters.ids || null };
  const rows = type === "people" ? peopleRows(f) : companyRows(f, base);
  return { csv: toCsv(rows), count: rows.length - 1 };
}
