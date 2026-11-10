// CreativeIn as a connector (MCP server) for Claude, ChatGPT and other assistants: read-only tools over the
// published directory (site/data), the same data the site shows. No per-person data, no people lists, nothing
// from Supabase. Every result carries its page on the site (`url`), and updates and tenders their official
// source. Served by app/api/mcp/route.js. Server only.
import { ORGS as INDEX, searchCompanies } from "@/lib/companies";
import { ORG_LIST, orgById } from "@/lib/orgs";
import { UPDATES, BEATS, beatByKey, updateById, updateItem, listUpdates, orgIdsOf } from "@/lib/front";
import { listTenders, daysLeft } from "@/lib/tenders";
import { siteUrl } from "@/lib/digest";
import { CRAFTS, CRAFT_SLUGS } from "@/lib/taxonomy";
import { fold } from "@/lib/match";

export const SERVER = { name: "creativein", title: "CreativeIn", version: "0.1.0" };
// Newest first; the client's version is echoed when we know it.
export const PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export const INSTRUCTIONS = `CreativeIn (creativein.co.il) maps Israel's creative industry: brands, ad agencies, studios, production companies and creative-tech startups, the updates about them (campaigns with credits, appointments, agency moves, deals, launches, job postings) and open public tenders for creative work. Everything is public business information with a source.

How to use it:
- "search" finds companies, updates and tenders by words; "fetch" returns one of them in full by its id.
- "search_companies" filters the directory by craft, company type and city. "recent_updates" lists what happened lately. "open_tenders" lists tenders open for submission now or opening soon.
- Only open tenders and published job postings are opportunities. Every other update is a business signal: never present it as proof that a company is hiring or commissioning work.
- Names are in Hebrew and/or English; search works in both. Dates are ISO (Israel time for deadlines).
- Always give the person the "url" of what you mention, and the official "source_url" for updates and tenders. Before applying to a job or a tender, they should check the source: it may have changed.`;

const KINDS = ["client", "agency", "studio", "production_company", "startup", "community"];
const KIND_EN = { client: "brand / client", agency: "ad agency", studio: "studio", production_company: "production company", startup: "startup", community: "community" };
const BY_INDEX = new Map(INDEX.map((o) => [o.id, o]));
const abs = (path) => `${siteUrl()}${path}`;
const str = (v, n = 160) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v, def, max) => Math.max(1, Math.min(Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : def, max));
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)));
const craftOf = (v) => {
  const s = str(v, 60);
  if (CRAFT_SLUGS.includes(s)) return s;
  const f = fold(s);
  return f ? CRAFTS.find((c) => fold(c.he) === f || fold(c.slug.replace(/-/g, " ")) === f)?.slug || "" : "";
};

function companyRow(id) {
  const o = orgById(id);
  const i = BY_INDEX.get(id);
  if (!o) return null;
  return clean({
    id: `company:${o.id}`,
    name: o.name,
    name_he: o.name_he,
    type: KIND_EN[o.kind] || o.kind,
    city: o.location?.city,
    categories: (i?.crafts || []).slice(0, 8), // what it makes; for a brand, its sector and what it commissions
    buys: (i?.buys || []).slice(0, 6),
    url: abs(`/companies/${encodeURIComponent(o.id)}`),
  });
}

function companyFull(id) {
  const o = orgById(id);
  if (!o) return null;
  const updates = UPDATES.filter((s) => orgIdsOf(s).includes(o.id)).slice(0, 6).map(updateRow);
  return clean({
    ...companyRow(id),
    description: o.description,
    description_he: o.description_he,
    founded: o.founded,
    size: o.size,
    website: o.website,
    services: (o.services || []).slice(0, 12),
    creative_needs: (o.client_profile?.creative_needs || []).slice(0, 10),
    works_with_agencies: (o.client_profile?.known_agencies || []).slice(0, 8),
    notable_clients: (o.notable_clients || []).slice(0, 12),
    notable_work: (o.notable_work || []).slice(0, 6),
    recent_updates: updates,
    last_verified: o.last_verified,
    note: "People at the company are listed on its page (url), not here.",
  });
}

function updateRow(s) {
  const i = updateItem(s);
  return clean({
    id: `update:${i.id}`,
    kind: i.class === "opportunity" ? "job posting" : "update",
    section: BEATS.find((b) => b.key === i.beat)?.key,
    type: i.type,
    date: i.date,
    title: i.title,
    job_title: i.job_title,
    headline: s.headline,
    headline_he: i.headline,
    why_it_matters: s.why,
    why_it_matters_he: i.why,
    company: i.org?.name,
    company_id: i.org?.id ? `company:${i.org.id}` : undefined,
    credits: s.credits && Object.keys(s.credits).length ? s.credits : undefined,
    crafts: i.crafts.map((c) => c.slug),
    url: abs(i.href),
    source: i.source,
    source_url: i.source_url,
  });
}

function tenderRow(t) {
  return clean({
    id: `tender:${t.id}`,
    kind: t.kind, // tender | framework | pool_call | rfi | call
    kind_he: t.kind_he,
    state: t.state, // open | upcoming | closed | cancelled; only "open" accepts bids now
    title: t.title,
    summary: t.scope_summary,
    buyer: t.buyer_name_he || t.buyer,
    submission_opens: t.state === "upcoming" ? t.submission_opens : undefined,
    deadline: t.deadline_at,
    days_left: t.state === "open" ? Math.max(0, daysLeft(t)) : undefined,
    crafts: t.crafts,
    url: abs("/tenders"),
    source: t.source,
    source_url: t.source_url,
  });
}

const TEXT = new Map(UPDATES.map((s) => [s.id, fold([s.headline_he, s.headline, s.title_he, s.job_title, s.org_name, s.why_he, s.why, ...Object.values(s.credits || {})].join(" "))]));

// One search across companies, updates and tenders: every word must appear. Companies first (name matches lead).
function searchAll(query, limit = 12) {
  const q = str(query, 200);
  const terms = fold(q).split(" ").filter(Boolean);
  if (!terms.length) return [];
  const companies = searchCompanies(q).slice(0, limit).map((o) => {
    const full = orgById(o.id);
    return { id: `company:${o.id}`, title: `${o.name_he ? `${o.name_he} (${o.name})` : o.name} · ${KIND_EN[o.kind] || o.kind}${full?.location?.city ? ` · ${full.location.city}` : ""}`, url: abs(`/companies/${encodeURIComponent(o.id)}`) };
  });
  const updates = UPDATES.filter((s) => terms.every((w) => TEXT.get(s.id).includes(w))).slice(0, limit)
    .map((s) => { const i = updateItem(s); return { id: `update:${s.id}`, title: `${i.title} · ${i.label} · ${i.date}`, url: abs(i.href) }; });
  const tenders = listTenders({ q }).slice(0, 6)
    .map((t) => ({ id: `tender:${t.id}`, title: `${t.scope_summary || t.title} · ${t.kind_he} · ${t.buyer_name_he || t.buyer}`, url: t.source_url || abs("/tenders") }));
  // Interleave so one kind never crowds out the others.
  const out = [];
  for (let n = 0; out.length < limit && (companies[n] || updates[n] || tenders[n]); n++) for (const list of [companies, updates, tenders]) if (list[n] && out.length < limit) out.push(list[n]);
  return out;
}

function fetchOne(rawId) {
  const raw = str(rawId, 140);
  const [kind, ...rest] = raw.includes(":") ? raw.split(":") : ["", raw];
  const id = rest.join(":");
  if ((kind === "company" || !kind) && orgById(id)) {
    const c = companyFull(id);
    return { id: c.id, title: c.name_he ? `${c.name_he} (${c.name})` : c.name, text: JSON.stringify(c, null, 1), url: c.url, metadata: { kind: "company", type: c.type, city: c.city || "" } };
  }
  if ((kind === "update" || !kind) && updateById(id)) {
    const u = updateRow(updateById(id));
    return { id: u.id, title: u.title, text: JSON.stringify(u, null, 1), url: u.url, metadata: { kind: u.kind, date: u.date, source_url: u.source_url || "" } };
  }
  const t = (kind === "tender" || !kind) && listTenders({ closed: true }).find((x) => x.id === id);
  if (t) {
    const r = tenderRow(t);
    return { id: r.id, title: r.summary || r.title, text: JSON.stringify(r, null, 1), url: r.source_url || r.url, metadata: { kind: "tender", state: r.state, deadline: r.deadline || "" } };
  }
  throw new Error(`Nothing with the id "${raw}". Use an id returned by search, search_companies, recent_updates or open_tenders.`);
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS = [
  {
    name: "search",
    title: "Search CreativeIn",
    description: "Search Israel's creative-industry directory by words (Hebrew or English): companies (brands, ad agencies, studios, production companies, startups), recent updates about them, and open tenders. Returns ids, titles and links; call fetch with an id for the details.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "A company name, a craft, a brand, a topic. A few words work best." } }, required: ["query"] },
    run: (a) => ({ results: searchAll(a.query) }),
  },
  {
    name: "fetch",
    title: "Get one company, update or tender",
    description: "Full details for one id from search or the other tools (company:…, update:…, tender:…): a company's description, what it makes or buys, who it works with and its recent updates; an update's headline, why it matters, credits and official source; a tender's scope, deadline and official source.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "An id such as company:mccann-tel-aviv, update:sig-2026-11-01-…, tender:…" } }, required: ["id"] },
    run: (a) => fetchOne(a.id),
  },
  {
    name: "search_companies",
    title: "Filter the company directory",
    description: `Companies in the directory, filtered by any of: words, craft, company type, city. Use it for questions like "who commissions motion design in Tel Aviv" (craft + type "client") or "production companies in Haifa". A craft matches companies that make it or that buy it. Crafts: ${CRAFT_SLUGS.join(", ")}.`,
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Words to match in names, descriptions, clients and services (optional)" },
      craft: { type: "string", description: "A craft slug from the list, or its Hebrew name" },
      type: { type: "string", enum: KINDS, description: "client = brands and public bodies that buy creative work" },
      city: { type: "string", description: "City in English, e.g. Tel Aviv, Jerusalem, Haifa" },
      limit: { type: "number", description: "Up to 30 (default 15)" },
    } },
    run(a) {
      const craft = craftOf(a.craft), kind = KINDS.includes(a.type) ? a.type : "", city = fold(str(a.city, 60)), q = str(a.query, 200);
      if (a.craft && !craft) throw new Error(`Unknown craft "${str(a.craft, 60)}". Use one of: ${CRAFT_SLUGS.join(", ")}.`);
      const pool = q || craft || kind ? searchCompanies(q, craft, kind) : INDEX;
      const hits = pool.filter((o) => !city || fold(o.city || "") === city);
      const limit = num(a.limit, 15, 30);
      return { total: hits.length, close_matches_only: Boolean(pool.loose) || undefined, companies: hits.slice(0, limit).map((o) => companyRow(o.id)).filter(Boolean), more: hits.length > limit ? abs("/companies") : undefined };
    },
  },
  {
    name: "recent_updates",
    title: "What happened lately",
    description: `Recent updates in the industry, newest first: ${BEATS.map((b) => `${b.key} (${b.he})`).join(", ")}. "jobs" are published job postings (with the title as posted); every other section is a business signal, not proof of hiring or commissioning. Each update has a short title, why it matters, credits (agency, production, director…) when published, its page and its official source.`,
    inputSchema: { type: "object", properties: {
      section: { type: "string", enum: BEATS.map((b) => b.key) },
      craft: { type: "string", description: "Only updates that name this craft or credit someone in it" },
      company: { type: "string", description: "Only updates about this company (an id from search_companies, or its name)" },
      days: { type: "number", description: "How far back, up to 120 (default 30)" },
      limit: { type: "number", description: "Up to 30 (default 12)" },
    } },
    run(a) {
      const craft = craftOf(a.craft);
      if (a.craft && !craft) throw new Error(`Unknown craft "${str(a.craft, 60)}". Use one of: ${CRAFT_SLUGS.join(", ")}.`);
      const days = num(a.days, 30, 120), limit = num(a.limit, 12, 30);
      const who = str(a.company, 100).replace(/^company:/, "");
      const named = who && !orgById(who) ? searchCompanies(who) : [];
      const orgId = who ? (orgById(who)?.id || (!named.loose && named[0]?.id) || "") : "";
      if (who && !orgId) throw new Error(`No company called "${who}" in the directory. Try search_companies first.`);
      let items = listUpdates({ beat: beatByKey(a.section)?.key || "", crafts: craft ? [craft] : [], days, max: 200 });
      if (orgId) items = items.filter((i) => orgIdsOf(updateById(i.id)).includes(orgId));
      return { total: items.length, updates: items.slice(0, limit).map((i) => updateRow(updateById(i.id))), more: items.length > limit ? abs("/updates") : undefined };
    },
  },
  {
    name: "open_tenders",
    title: "Open tenders for creative work",
    description: "Public tenders and supplier-pool calls for creative work in Israel that are open for submission now (state \"open\", soonest deadline first) or published and opening soon (state \"upcoming\"; not open yet). Each has its scope, buyer, deadline (Israel time) and the official source link, which is where bids are submitted.",
    inputSchema: { type: "object", properties: {
      craft: { type: "string", description: "Only tenders for this craft (optional)" },
      query: { type: "string", description: "Words to match in the title, buyer or scope (optional)" },
    } },
    run(a) {
      const craft = craftOf(a.craft);
      if (a.craft && !craft) throw new Error(`Unknown craft "${str(a.craft, 60)}". Use one of: ${CRAFT_SLUGS.join(", ")}.`);
      const rows = listTenders({ craft, q: str(a.query, 200) });
      return { open: rows.filter((t) => t.state === "open").length, upcoming: rows.filter((t) => t.state === "upcoming").length, tenders: rows.slice(0, 20).map(tenderRow), all: abs("/tenders") };
    },
  },
];
const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export const listTools = () => TOOLS.map(({ run, ...t }) => ({ ...t, annotations: READ_ONLY }));

/** Runs one tool. Bad input comes back as an error result the assistant can read and correct. */
export function callTool(name, args) {
  const tool = BY_NAME.get(String(name || ""));
  if (!tool) return null;
  try {
    const out = tool.run(args && typeof args === "object" ? args : {});
    return { content: [{ type: "text", text: JSON.stringify(out) }], isError: false };
  } catch (e) {
    return { content: [{ type: "text", text: String(e?.message || "The request could not be answered.") }], isError: true };
  }
}

const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/**
 * One JSON-RPC message → its response, or null for a notification. Stateless: no sessions, no streams.
 * `log(method, tool)` gets the method and tool names only, never what was asked.
 */
export function handleRpc(msg, { log = () => {} } = {}) {
  if (!msg || typeof msg !== "object" || Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid request");
  const { id, method, params } = msg;
  if (id === undefined || id === null) return null; // notifications (notifications/initialized, cancelled…)
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  if (method === "initialize") {
    const asked = String(params?.protocolVersion || "");
    return ok({ protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: INSTRUCTIONS });
  }
  if (method === "ping") return ok({});
  if (method === "tools/list") return ok({ tools: listTools() });
  if (method === "tools/call") {
    const res = callTool(params?.name, params?.arguments);
    if (!res) return rpcError(id, -32602, `Unknown tool: ${String(params?.name || "").slice(0, 60)}`);
    log(method, String(params.name));
    return ok(res);
  }
  if (method === "resources/list") return ok({ resources: [] });
  if (method === "prompts/list") return ok({ prompts: [] });
  return rpcError(id, -32601, `Method not found: ${method.slice(0, 60)}`);
}
