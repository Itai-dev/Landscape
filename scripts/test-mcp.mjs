// Checks for the connector (lib/mcp.js, app/api/mcp/route.js): the protocol handshake, the tool list, each tool
// against the published data, links back to the site, no people lists, and that it is off unless MCP=on.
// Run after `npm run build`: node scripts/test-mcp.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
const { handleRpc, listTools, callTool, PROTOCOLS } = await import("../lib/mcp.js");
const { siteUrl } = await import("../lib/digest.js");
const { default: dataset } = await import("../site/data/dataset.json", { with: { type: "json" } });

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const rpc = (method, params, id = 1) => handleRpc({ jsonrpc: "2.0", id, method, params });
const call = (name, args) => { const r = callTool(name, args); return { ...r, data: r.isError ? null : JSON.parse(r.content[0].text), text: r.content[0].text }; };
const BASE = siteUrl();

t("initialize echoes a known protocol version, falls back to the newest, and offers only tools", () => {
  const a = rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } }).result;
  assert.equal(a.protocolVersion, "2025-03-26");
  assert.equal(rpc("initialize", { protocolVersion: "1999-01-01" }).result.protocolVersion, PROTOCOLS[0]);
  assert.deepEqual(Object.keys(a.capabilities), ["tools"]);
  assert.equal(a.serverInfo.name, "creativein");
  assert.match(a.instructions, /never present it as proof/);
});

t("notifications get no answer; unknown methods and bad messages are JSON-RPC errors", () => {
  assert.equal(handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  assert.equal(rpc("nope").error.code, -32601);
  assert.equal(handleRpc({ id: 1, method: "ping" }).error.code, -32600);
  assert.deepEqual(rpc("ping").result, {});
  assert.equal(rpc("tools/call", { name: "delete_everything", arguments: {} }).error.code, -32602);
});

t("five read-only tools, each with a schema; search and fetch take what ChatGPT expects", () => {
  const tools = rpc("tools/list").result.tools;
  assert.deepEqual(tools.map((x) => x.name), ["search", "fetch", "search_companies", "recent_updates", "open_tenders"]);
  for (const x of tools) {
    assert.equal(x.inputSchema.type, "object");
    assert.equal(x.annotations.readOnlyHint, true);
    assert.ok(x.description.length > 40 && !("run" in x));
  }
  assert.deepEqual(tools[0].inputSchema.required, ["query"]);
  assert.deepEqual(tools[1].inputSchema.required, ["id"]);
  assert.equal(listTools().length, 5);
});

t("search finds a company by its name, in English and in Hebrew, with a link to its page", () => {
  const org = dataset.orgs.find((o) => o.name_he && /^[a-z]/i.test(o.name) && o.name.length > 4);
  for (const q of [org.name, org.name_he]) {
    const { data } = call("search", { query: q });
    const hit = data.results.find((r) => r.id === `company:${org.id}`);
    assert.ok(hit, `${q} → ${org.id}`);
    assert.equal(hit.url, `${BASE}/companies/${encodeURIComponent(org.id)}`);
    assert.ok(hit.title);
  }
  assert.deepEqual(call("search", { query: "  " }).data.results, []);
  assert.ok(call("search", { query: "zzzzqqqq-nothing" }).data.results.length === 0);
});

t("fetch returns id, title, text, url and metadata for a company, an update and a tender; unknown ids are a readable error", () => {
  const org = dataset.orgs[0];
  const c = call("fetch", { id: `company:${org.id}` }).data;
  assert.deepEqual(Object.keys(c).sort(), ["id", "metadata", "text", "title", "url"]);
  assert.equal(JSON.parse(c.text).name, org.name);
  const up = call("recent_updates", { days: 120, limit: 1 }).data.updates[0];
  const u = call("fetch", { id: up.id }).data;
  assert.equal(u.url, up.url);
  assert.match(u.url, new RegExp(`^${BASE.replace(/[.]/g, "\\.")}/updates/sig-`));
  const tenders = call("open_tenders", {}).data.tenders;
  if (tenders.length) assert.equal(call("fetch", { id: tenders[0].id }).data.id, tenders[0].id);
  const bad = call("fetch", { id: "company:does-not-exist" });
  assert.equal(bad.isError, true);
  assert.match(bad.text, /Nothing with the id/);
});

t("a company never comes with its people: they stay on the site", () => {
  const org = dataset.orgs.find((o) => (o.key_people || []).length > 0);
  const full = JSON.parse(call("fetch", { id: `company:${org.id}` }).data.text);
  assert.equal(full.people, undefined);
  assert.equal(full.key_people, undefined);
  assert.ok(!JSON.stringify(full).includes(org.key_people[0].name) || (org.description || "").includes(org.key_people[0].name) || JSON.stringify(full.recent_updates || []).includes(org.key_people[0].name), "a person's name only where the public description or an update already has it");
});

t("search_companies filters by craft, type and city, caps the list, and rejects an unknown craft", () => {
  const a = call("search_companies", { craft: "motion-design", type: "client" }).data;
  assert.ok(a.total > 0 && a.companies.length <= 15);
  assert.ok(a.companies.every((c) => c.type === "brand / client" && c.url.startsWith(`${BASE}/companies/`)));
  const tlv = call("search_companies", { city: "Tel Aviv", type: "studio", limit: 100 }).data;
  assert.ok(tlv.companies.length <= 30 && tlv.companies.every((c) => c.city === "Tel Aviv"));
  const he = dataset.taxonomy.categories_he["motion-design"];
  assert.equal(call("search_companies", { craft: he, type: "client" }).data.total, a.total, "a craft by its Hebrew name");
  assert.equal(call("search_companies", { craft: "underwater-basket-weaving" }).isError, true);
});

t("recent_updates: jobs carry the title as posted, every update has its page and source", () => {
  const all = call("recent_updates", { days: 120, limit: 30 }).data.updates;
  assert.ok(all.length > 5);
  for (const u of all) { assert.match(u.url, /\/updates\/sig-/); assert.ok(u.title && u.date && u.kind); }
  const jobs = call("recent_updates", { section: "jobs", days: 120 }).data.updates;
  assert.ok(jobs.length > 0 && jobs.every((j) => j.kind === "job posting" && j.type === "hiring" && j.source_url));
  assert.ok(jobs.some((j) => j.job_title));
  assert.ok(call("recent_updates", { section: "campaigns", days: 120 }).data.updates.every((u) => u.kind === "update"));
  assert.equal(call("recent_updates", { company: "no such company zz" }).isError, true);
  const withNews = jobs[0].company_id;
  assert.ok(call("recent_updates", { company: withNews, days: 120 }).data.updates.some((u) => u.id === jobs[0].id), "by company id");
});

t("open_tenders lists only live tenders, with the official source", () => {
  const d = call("open_tenders", {}).data;
  assert.equal(d.tenders.length, Math.min(20, d.open + d.upcoming));
  for (const x of d.tenders) { assert.ok(["open", "upcoming"].includes(x.state)); assert.ok(x.source_url && x.deadline); }
  assert.ok(d.tenders.filter((x) => x.state === "upcoming").every((x) => x.days_left === undefined));
});

t("the route is off unless MCP=on, answers JSON-RPC over POST, 202 for notifications, 405 for GET", async () => {
  const { POST, GET, OPTIONS } = await import("../app/api/mcp/route.js");
  const post = (body, headers = { "content-type": "application/json" }) => POST(new Request("https://x.test/api/mcp", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
  delete process.env.MCP; delete process.env.VERCEL_ENV;
  assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" })).status, 404);
  process.env.VERCEL_ENV = "preview";
  assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" })).status, 200);
  delete process.env.VERCEL_ENV; process.env.MCP = "on";
  const res = await post({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "search", arguments: { query: "wix" } } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^application\/json/);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  const body = await res.json();
  assert.equal(body.id, 7);
  assert.ok(JSON.parse(body.result.content[0].text).results.length > 0);
  assert.equal((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
  assert.equal((await post("{not json")).status, 400);
  assert.equal((await post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "content-type": "text/plain" })).status, 415);
  assert.equal((await post("x".repeat(40_000))).status, 413);
  const batch = await (await post([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }])).json();
  assert.equal(batch.length, 1);
  assert.equal((await GET()).status, 405);
  assert.equal((await OPTIONS()).status, 204);
  // 60 calls a minute per caller.
  let last;
  for (let k = 0; k < 70; k++) last = await post({ jsonrpc: "2.0", id: k, method: "ping" }, { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" });
  assert.equal(last.status, 429);
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log(`✓ ${name}`); } catch (e) { console.log(`✗ ${name}\n  ${e.message}`); }
}
console.log(`${passed}/${tests.length} mcp checks passed`);
process.exit(passed === tests.length ? 0 : 1);
