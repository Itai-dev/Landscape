// End-to-end check of the magic-link landing (/auth/callback) with an in-memory Supabase that rejects
// non-uuid user ids like PostgREST does: a company followed signed out must be saved once the address is confirmed.
// Run after `npm run build` (needs lib/generated/orgs.json): node scripts/test-callback.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
register("./test-hooks-stubs.mjs", import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub";

const stub = await import("./stubs/supabase-server.mjs");
const { GET } = await import("../app/auth/callback/route.js");
const { default: orgsFile } = await import("../lib/generated/orgs.json", { with: { type: "json" } });
const ORG = (orgsFile.orgs || orgsFile)[0].id;

const errors = [];
const origError = console.error;
console.error = (...a) => {
  errors.push(a.join(" "));
};

let passed = 0;
async function t(name, fn) {
  for (const k of Object.keys(stub.tables)) delete stub.tables[k];
  errors.length = 0;
  stub.state.exchangeError = null;
  await fn();
  passed++;
  console.log(`ok ${name}`);
}
const user = { id: "22222222-2222-4222-8222-222222222222", email: "b@example.com", email_confirmed_at: "2026-10-20T00:00:00Z" };

await t("signed-out follow is saved after the link is opened, with the alerts opt-in", async () => {
  stub.state.user = user;
  stub.tables.newsletter_prefs = [{ user_id: user.id, email: user.email, frequency: "off", alerts: "off", alerts_consent_at: null }];
  const res = await GET(new Request(`https://x.test/auth/callback?code=abc&follow=${ORG}&alerts=daily&next=/me%23follows`));
  assert.equal(res.headers.get("location"), "https://x.test/me#follows");
  assert.deepEqual((stub.tables.org_follows || []).map((r) => [r.user_id, r.org_id]), [[user.id, ORG]]);
  const prefs = stub.tables.newsletter_prefs[0];
  assert.equal(prefs.alerts, "daily");
  assert.ok(prefs.alerts_consent_at);
  assert.deepEqual(errors, []);
});

await t("an unknown company id is ignored", async () => {
  stub.state.user = user;
  await GET(new Request("https://x.test/auth/callback?code=abc&follow=not-a-real-org&alerts=daily"));
  assert.equal((stub.tables.org_follows || []).length, 0);
});

await t("someone who switched alerts off keeps them off when following again", async () => {
  stub.state.user = user;
  stub.tables.newsletter_prefs = [{ user_id: user.id, email: user.email, frequency: "off", alerts: "off", alerts_consent_at: "2026-10-01T00:00:00Z" }];
  await GET(new Request(`https://x.test/auth/callback?code=abc&follow=${ORG}&alerts=daily`));
  assert.equal(stub.tables.org_follows.length, 1);
  assert.equal(stub.tables.newsletter_prefs[0].alerts, "off");
});

await t("a failed code exchange records nothing", async () => {
  stub.state.user = user;
  stub.state.exchangeError = { message: "bad code" };
  const res = await GET(new Request(`https://x.test/auth/callback?code=abc&follow=${ORG}&alerts=daily`));
  assert.match(res.headers.get("location"), /auth_error=1/);
  assert.equal((stub.tables.org_follows || []).length, 0);
});

await t("next must stay on this site", async () => {
  stub.state.user = user;
  const res = await GET(new Request("https://x.test/auth/callback?code=abc&next=//evil.example"));
  assert.ok(res.headers.get("location").startsWith("https://x.test/"));
});

console.error = origError;
console.log(`${passed} checks passed`);
