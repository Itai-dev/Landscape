// The newsletter journey, offline: address and choices on the form → magic link → confirmation →
// consent recorded → personalised edition → schedule (weekly / biweekly / monthly, Israel time) →
// sending at most once → unsubscribe (link and one-click) → resubscribe with a new consent.
// Supabase and Resend are replaced by in-memory stand-ins, so this does NOT prove that a real Resend send
// or a real Supabase magic link works: those need the live services (see the list printed at the end).
// Run after `npm run build` (needs lib/generated/orgs.json): node scripts/test-newsletter.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
register("./test-hooks-stubs.mjs", import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub";
process.env.DIGEST_SECRET = "test-secret";

// authLink.js runs in the browser: give it a window and localStorage.
globalThis.window = { location: { origin: "https://x.test" } };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const stub = await import("./stubs/supabase-server.mjs");
const { callbackUrl, validEmail, normalEmail } = await import("../lib/authLink.js");
const { savePrefs, cleanCraftList, cleanFrequency, activeConsent } = await import("../lib/consent.js");
const { GET: callback } = await import("../app/auth/callback/route.js");
const prefsRoute = await import("../app/api/digest/prefs/route.js");
const unsubRoute = await import("../app/api/digest/unsubscribe/route.js");
const alertsUnsubRoute = await import("../app/api/alerts/unsubscribe/route.js");
const { dueFor, editionOf, nextSendDay } = await import("../lib/digestSchedule.js");
const { message, runDigest } = await import("../lib/digestSend.js");
const { unsubscribeToken, listToken, fromAddress } = await import("../lib/mailer.js");
const { CONSENT_TEXT } = await import("../lib/taxonomy.js");

const errors = [];
const origError = console.error;
console.error = (...a) => errors.push(a.join(" "));
const origWarn = console.warn;
console.warn = () => {};

let passed = 0;
async function t(name, fn) {
  for (const k of Object.keys(stub.tables)) delete stub.tables[k];
  stub.state.exchangeError = null;
  errors.length = 0;
  await fn();
  passed++;
  console.log(`ok ${name}`);
}

const U1 = "11111111-1111-4111-8111-111111111111";
const confirmedUser = { id: U1, email: "maya@example.com", email_confirmed_at: "2026-10-20T00:00:00Z" };
const unconfirmedUser = { id: U1, email: "maya@example.com" };
const prefsRow = () => stub.tables.newsletter_prefs?.[0];
const jsonPost = (url, body, headers = {}) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", origin: "https://x.test", host: "x.test", ...headers }, body: JSON.stringify(body) });

// --- 1–3. What the form accepts ----------------------------------------------------------------------------
await t("1. email: invalid addresses are refused, mixed case is normalised", async () => {
  for (const bad of ["", "maya", "maya@", "@example.com", "maya@example", "ma ya@example.com", "maya@exa mple.com"]) assert.equal(validEmail(bad), false, bad);
  assert.equal(validEmail("  Maya.Cohen@Example.CO.IL "), true);
  assert.equal(normalEmail("  Maya.Cohen@Example.CO.IL "), "maya.cohen@example.co.il");
});

await t("2. crafts: only known slugs, no duplicates, at most 12", async () => {
  assert.deepEqual(cleanCraftList("motion-design,bogus,motion-design, vfx"), ["motion-design", "vfx"]);
  assert.deepEqual(cleanCraftList(["<script>", "branding"]), ["branding"]);
  assert.deepEqual(cleanCraftList(null), []);
});

await t("3. frequency: weekly, biweekly, monthly or off; anything else is ignored", async () => {
  for (const f of ["weekly", "biweekly", "monthly", "off"]) assert.equal(cleanFrequency(f), f);
  for (const f of ["daily", "", "WEEKLY", null]) assert.equal(cleanFrequency(f), null);
});

// --- 4. Consent is enforced on the server -----------------------------------------------------------------
await t("4. no consent, no subscription (server side), and only for a confirmed address", async () => {
  stub.tables.newsletter_prefs = [{ user_id: U1, email: confirmedUser.email, frequency: "off", consent_at: null, unsubscribed_at: null }];
  const db = stub.adminClient();
  assert.equal((await savePrefs(db, confirmedUser, { frequency: "weekly", consent: false })).error, "consent_required");
  assert.equal((await savePrefs(db, confirmedUser, { frequency: "weekly", consent: "yes" })).error, "consent_required");
  assert.equal((await savePrefs(db, unconfirmedUser, { frequency: "weekly", consent: true })).error, "unconfirmed");
  assert.equal(prefsRow().frequency, "off");
  // The same through the API route the settings page and signed-in form use.
  stub.state.user = confirmedUser;
  const res = await prefsRoute.POST(jsonPost("https://x.test/api/digest/prefs", { frequency: "weekly", crafts: [], consent: false }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "consent_required");
});

await t("4b. the prefs API takes JSON from this site only", async () => {
  stub.state.user = confirmedUser;
  stub.tables.newsletter_prefs = [{ user_id: U1, email: confirmedUser.email, frequency: "off", consent_at: null }];
  const cross = await prefsRoute.POST(jsonPost("https://x.test/api/digest/prefs", { frequency: "weekly", consent: true }, { origin: "https://evil.example" }));
  assert.equal(cross.status, 400);
  const form = await prefsRoute.POST(new Request("https://x.test/api/digest/prefs", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", host: "x.test" }, body: "frequency=weekly&consent=true" }));
  assert.equal(form.status, 400);
  stub.state.user = null;
  assert.equal((await prefsRoute.POST(jsonPost("https://x.test/api/digest/prefs", { frequency: "weekly", consent: true }))).status, 401);
  assert.equal(prefsRow().frequency, "off");
});

// --- 6. The magic link carries the choices -----------------------------------------------------------------
await t("6. the magic link returns to /auth/callback with frequency and crafts", async () => {
  const url = new URL(callbackUrl({ next: "/digest/settings?welcome=1", subscribe: "monthly", crafts: ["motion-design", "animation-2d"] }));
  assert.equal(url.origin, "https://x.test");
  assert.equal(url.pathname, "/auth/callback");
  assert.equal(url.searchParams.get("subscribe"), "monthly");
  assert.equal(url.searchParams.get("crafts"), "motion-design,animation-2d");
  assert.equal(url.searchParams.get("next"), "/digest/settings?welcome=1");
  // A plain sign-in carries neither.
  const plain = new URL(callbackUrl({}));
  assert.equal(plain.searchParams.get("subscribe"), null);
  assert.equal(plain.searchParams.get("crafts"), null);
  // An account without the newsletter (/join, "לא עכשיו"): the crafts ride along, no frequency, so nothing is sent.
  const noNews = new URL(callbackUrl({ crafts: ["vfx"] }));
  assert.equal(noNews.searchParams.get("crafts"), "vfx");
  assert.equal(noNews.searchParams.get("subscribe"), null);
});

// --- 7. Consent is recorded only when the link is opened ----------------------------------------------------
await t("7. opening the link records the subscription and consent; crafts are checked again", async () => {
  stub.state.user = confirmedUser;
  stub.tables.newsletter_prefs = [{ user_id: U1, email: confirmedUser.email, frequency: "off", consent_at: null, unsubscribed_at: null }];
  const res = await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=biweekly&crafts=motion-design,bogus&next=/digest/settings%3Fwelcome%3D1"));
  assert.equal(res.headers.get("location"), "https://x.test/digest/settings?welcome=1");
  const row = prefsRow();
  assert.equal(row.frequency, "biweekly");
  assert.deepEqual(row.crafts, ["motion-design"]);
  assert.ok(row.consent_at);
  assert.equal(row.consent_text, CONSENT_TEXT);
  assert.equal(row.unsubscribed_at, null);
  assert.deepEqual(errors, []);
});

await t("7b. nothing is recorded without a confirmed address, a valid code or a valid frequency", async () => {
  stub.tables.newsletter_prefs = [{ user_id: U1, email: confirmedUser.email, frequency: "off", consent_at: null }];
  stub.state.user = unconfirmedUser;
  await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=weekly"));
  assert.equal(prefsRow().frequency, "off");
  stub.state.user = confirmedUser;
  stub.state.exchangeError = { message: "expired" };
  const bad = await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=weekly"));
  assert.match(bad.headers.get("location"), /auth_error=1/);
  assert.equal(prefsRow().frequency, "off");
  stub.state.exchangeError = null;
  await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=daily"));
  assert.equal(prefsRow().frequency, "off");
  assert.equal(prefsRow().consent_at, null);
});

await t("1b. subscribing twice keeps one row and the first consent", async () => {
  stub.state.user = confirmedUser;
  stub.tables.newsletter_prefs = [{ user_id: U1, email: confirmedUser.email, frequency: "off", consent_at: null, unsubscribed_at: null }];
  await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=weekly&crafts=vfx"));
  const first = prefsRow().consent_at;
  await new Promise((r) => setTimeout(r, 5));
  await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=weekly&crafts=branding"));
  assert.equal(stub.tables.newsletter_prefs.length, 1);
  assert.equal(prefsRow().consent_at, first);
  assert.deepEqual(prefsRow().crafts, ["branding"]); // the latest choice wins
});

// --- 8. The personalised edition -----------------------------------------------------------------------------
const SUNDAY = new Date("2026-10-25T04:00:00Z"); // 07:00 in Israel
await t("8. the edition is built for the chosen crafts, with brand, sender identity and unsubscribe", async () => {
  Object.assign(process.env, { DIGEST_SENDER_NAME: "Test Sender", DIGEST_SENDER_ADDRESS: "1 Test St", NEXT_PUBLIC_PRIVACY_EMAIL: "privacy@example.com" });
  const m = message({ userId: U1, email: "maya@example.com", prefs: { frequency: "weekly", topics: [] }, crafts: ["motion-design"], now: SUNDAY, base: "https://x.test" });
  assert.deepEqual(m.digest.crafts.map((c) => c.slug), ["motion-design"]);
  assert.match(m.email.html, /dir="rtl"/);
  assert.match(m.email.html, /\/brand\/creativein-wordmark\.png" width="132" height="36" alt="CreativeIn"/);
  // Old names never show: "Landscape", a lowercase "creativein" wordmark, or the word "גיליון".
  assert.doesNotMatch(m.email.html + m.email.text, /Landscape|>creativein<|גיליון/);
  assert.match(m.email.html, /Test Sender · 1 Test St/);
  const unsub = `https://x.test/digest/unsubscribe?u=${U1}&t=${unsubscribeToken(U1)}`;
  assert.ok(m.email.html.includes(unsub.replace(/&/g, "&amp;")));
  assert.ok(m.email.text.includes(unsub));
  assert.ok(m.email.headers["List-Unsubscribe"].includes(`https://x.test/api/digest/unsubscribe?u=${U1}`));
  assert.equal(m.email.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(m.email.subject.length > 0);
});

await t("8b. sender display name: a bare DIGEST_FROM gets DIGEST_SENDER_NAME", async () => {
  process.env.DIGEST_SENDER_NAME = "CreativeIn";
  process.env.DIGEST_FROM = "hello@creativein.co.il";
  assert.equal(fromAddress(), '"CreativeIn" <hello@creativein.co.il>');
  process.env.DIGEST_FROM = "CreativeIn <hello@creativein.co.il>";
  assert.equal(fromAddress(), "CreativeIn <hello@creativein.co.il>");
});

// --- 9. Schedule, Israel time ---------------------------------------------------------------------------------
await t("9. editions: the Sunday in Israel; weekly every Sunday, biweekly every other, monthly the first", async () => {
  assert.equal(editionOf(new Date("2026-10-24T22:30:00Z")), "2026-10-25"); // Saturday 22:30 UTC is Sunday 01:30 in Israel
  assert.equal(editionOf(new Date("2026-10-24T20:00:00Z")), "2026-10-18"); // still Saturday in Israel
  const sundays = ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29", "2026-12-06"];
  assert.deepEqual(sundays.map((d) => dueFor("weekly", d)), [true, true, true, true, true, true]);
  const bi = sundays.map((d) => dueFor("biweekly", d));
  assert.deepEqual(bi, [bi[0], !bi[0], bi[0], !bi[0], bi[0], !bi[0]]); // alternates
  assert.deepEqual(sundays.map((d) => dueFor("monthly", d)), [true, false, false, false, false, true]);
  assert.equal(dueFor("off", "2026-11-01"), false);
  assert.equal(new Date(nextSendDay("monthly", new Date("2026-11-02T08:00:00Z"))).getUTCDay(), 0);
  assert.equal(nextSendDay("monthly", new Date("2026-11-02T08:00:00Z")), "2026-12-06");
});

// A stand-in for what runDigest uses: digest_recipients(), digest_sends with unique (user_id, edition),
// profiles and newsletter_prefs updates. Calls interleave like concurrent cron runs would.
function fakeDb(recipients) {
  const tables = { digest_sends: [], profiles: [], org_follows: [], newsletter_prefs: recipients.map((r) => ({ user_id: r.user_id })) };
  const key = (r) => `${r.user_id}|${r.edition}`;
  function query(table) {
    const filters = [];
    let op = "select", payload = null, opts = {};
    const q = {
      select() { return q; },
      eq(c, v) { filters.push((r) => r[c] === v); return q; },
      in(c, vs) { filters.push((r) => vs.includes(r[c])); return q; },
      upsert(rows, o) { op = "upsert"; payload = rows; opts = o || {}; return q; },
      update(p) { op = "update"; payload = p; return q; },
      delete() { op = "delete"; return q; },
      then(ok, ko) { return Promise.resolve().then(run).then(ok, ko); },
    };
    async function run() {
      await new Promise((r) => setTimeout(r, Math.random() * 3));
      const rows = tables[table];
      const match = (r) => filters.every((f) => f(r));
      if (op === "select") return { data: rows.filter(match), error: null };
      if (op === "upsert") {
        const inserted = [];
        for (const r of payload) {
          const i = rows.findIndex((x) => key(x) === key(r));
          if (i < 0) { rows.push({ ...r }); inserted.push(r); } else if (!opts.ignoreDuplicates) Object.assign(rows[i], r);
        }
        return { data: inserted, error: null };
      }
      if (op === "update") { rows.filter(match).forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (op === "delete") { tables[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
    }
    return q;
  }
  return { tables, from: query, rpc: () => ({ range: async () => ({ data: recipients, error: null }) }) };
}

const sent = [];
let failNext = false;
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /api\.resend\.com\/emails\/batch/);
  if (failNext) { failNext = false; return new Response(JSON.stringify({ message: "boom" }), { status: 500 }); }
  const batch = JSON.parse(init.body);
  sent.push(...batch);
  return new Response(JSON.stringify({ data: batch.map((_, i) => ({ id: `m${sent.length}-${i}` })) }), { status: 200 });
};
const SEND_ENV = { RESEND_API_KEY: "k", DIGEST_FROM: "CreativeIn <hello@example.com>", DIGEST_SENDER_NAME: "S", DIGEST_SENDER_ADDRESS: "Addr", NEXT_PUBLIC_PRIVACY_EMAIL: "p@example.com" };
const readers = () => [
  { user_id: "w", email: "w@example.com", frequency: "weekly", crafts: [], topics: [], last_sent_at: null },
  { user_id: "b", email: "b@example.com", frequency: "biweekly", crafts: [], topics: [], last_sent_at: null },
  { user_id: "m", email: "m@example.com", frequency: "monthly", crafts: [], topics: [], last_sent_at: null },
];
const setup = () => { Object.assign(process.env, SEND_ENV); sent.length = 0; return fakeDb(readers()); };
const to = () => sent.map((e) => e.to[0]).sort();

await t("9b. Sunday 25 Oct: weekly gets it, monthly waits for the first Sunday; a second run sends nothing", async () => {
  const db = setup();
  const r1 = await runDigest(db, { now: SUNDAY });
  const expect = ["w@example.com", ...(dueFor("biweekly", "2026-10-25") ? ["b@example.com"] : [])].sort();
  assert.deepEqual(to(), expect);
  assert.equal(r1.sent, expect.length);
  assert.ok(sent.every((e) => e.from === SEND_ENV.DIGEST_FROM));
  const r2 = await runDigest(db, { now: new Date("2026-10-25T10:00:00Z") });
  assert.equal(r2.sent, 0);
  assert.equal(sent.length, expect.length);
});

await t("9c. two runs at the same time send each reader once", async () => {
  const db = setup();
  await Promise.all([runDigest(db, { now: SUNDAY }), runDigest(db, { now: SUNDAY })]);
  assert.equal(new Set(to()).size, sent.length);
});

await t("9d. catch-up: Monday and Tuesday finish the edition, Wednesday doesn't send", async () => {
  const db = setup();
  const r = await runDigest(db, { now: SUNDAY, limit: 0 }); // nobody sent on Sunday (daily limit)
  assert.equal(sent.length, 0);
  assert.ok(r.remaining >= 1);
  await runDigest(db, { now: new Date("2026-10-27T04:00:00Z") }); // Tuesday
  assert.ok(sent.length >= 1);
  const wed = await runDigest(fakeDb(readers()), { now: new Date("2026-10-28T04:00:00Z") });
  assert.equal(wed.skipped, "outside_send_window");
});

await t("9e. monthly readers get the first Sunday of the month", async () => {
  const db = setup();
  await runDigest(db, { now: new Date("2026-11-01T04:00:00Z") });
  assert.ok(to().includes("m@example.com"));
});

await t("9f. a refused batch releases its claim; missing sender identity sends nothing", async () => {
  const db = setup();
  failNext = true;
  const r1 = await runDigest(db, { now: SUNDAY });
  assert.equal(r1.sent, 0);
  assert.equal(db.tables.digest_sends.filter((x) => x.status === "pending").length, 0);
  await runDigest(db, { now: SUNDAY });
  assert.ok(sent.length >= 1);
  const db2 = setup();
  delete process.env.DIGEST_SENDER_ADDRESS;
  const r3 = await runDigest(db2, { now: SUNDAY });
  assert.equal(r3.skipped, "missing_env");
  assert.equal(sent.length, 0);
});

// --- 10. Unsubscribe --------------------------------------------------------------------------------------------
const subscribed = () => [{ user_id: U1, email: confirmedUser.email, frequency: "weekly", crafts: ["vfx"], consent_at: "2026-10-01T00:00:00Z", unsubscribed_at: null }];
await t("10. one-click (RFC 8058) unsubscribes with the signed link; a wrong token does nothing", async () => {
  stub.tables.newsletter_prefs = subscribed();
  const bad = await unsubRoute.POST(new Request(`https://x.test/api/digest/unsubscribe?u=${U1}&t=nope`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" }));
  assert.equal(bad.status, 400);
  assert.equal(prefsRow().frequency, "weekly");
  const alertsToken = await unsubRoute.POST(new Request(`https://x.test/api/digest/unsubscribe?u=${U1}&t=${listToken("alerts", U1)}`, { method: "POST" }));
  assert.equal(alertsToken.status, 400); // an alerts link can't switch off the digest
  const ok = await unsubRoute.POST(new Request(`https://x.test/api/digest/unsubscribe?u=${U1}&t=${unsubscribeToken(U1)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" }));
  assert.equal(ok.status, 200);
  assert.equal(prefsRow().frequency, "off");
  assert.ok(prefsRow().unsubscribed_at);
});

await t("10b. the link in the email opens a confirm page (GET changes nothing); its button unsubscribes", async () => {
  stub.tables.newsletter_prefs = subscribed();
  const get = await unsubRoute.GET(new Request(`https://x.test/api/digest/unsubscribe?u=${U1}&t=${unsubscribeToken(U1)}`));
  assert.equal(get.status, 303);
  assert.match(get.headers.get("location"), /\/digest\/unsubscribe\?u=/);
  assert.equal(prefsRow().frequency, "weekly");
  const form = await unsubRoute.POST(new Request("https://x.test/api/digest/unsubscribe?form=1", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `u=${U1}&t=${unsubscribeToken(U1)}` }));
  assert.match(form.headers.get("location"), /done=1/);
  assert.equal(prefsRow().frequency, "off");
});

await t("10c. the alerts link stops alerts only", async () => {
  stub.tables.newsletter_prefs = [{ ...subscribed()[0], alerts: "daily", alerts_consent_at: "2026-10-01T00:00:00Z" }];
  const r = await alertsUnsubRoute.POST(new Request(`https://x.test/api/alerts/unsubscribe?u=${U1}&t=${listToken("alerts", U1)}`, { method: "POST" }));
  assert.equal(r.status, 200);
  assert.equal(prefsRow().alerts, "off");
  assert.equal(prefsRow().frequency, "weekly");
});

// --- 11. Resubscribe ------------------------------------------------------------------------------------------
await t("11. after an unsubscribe, turning it on again needs a new consent, recorded anew", async () => {
  stub.state.user = confirmedUser;
  stub.tables.newsletter_prefs = subscribed();
  await unsubRoute.POST(new Request(`https://x.test/api/digest/unsubscribe?u=${U1}&t=${unsubscribeToken(U1)}`, { method: "POST" }));
  assert.equal(activeConsent(prefsRow()), false);
  // The settings page is told consent is no longer active, so it shows the checkbox again.
  const got = await (await prefsRoute.GET()).json();
  assert.equal(got.prefs.consent_at, null);
  assert.equal(got.prefs.frequency, "off");
  assert.equal("unsubscribed_at" in got.prefs, false);
  const db = stub.adminClient();
  assert.equal((await savePrefs(db, confirmedUser, { frequency: "weekly", consent: false })).error, "consent_required");
  const res = await savePrefs(db, confirmedUser, { frequency: "monthly", consent: true });
  assert.equal(res.ok, true);
  const row = prefsRow();
  assert.equal(row.frequency, "monthly");
  assert.equal(row.unsubscribed_at, null);
  assert.ok(row.consent_at > "2026-10-01T00:00:00Z");
  assert.deepEqual(row.crafts, ["vfx"]); // crafts kept when not sent
});

await t("11b. resubscribing from the public form (magic link) also records a new consent", async () => {
  stub.state.user = confirmedUser;
  stub.tables.newsletter_prefs = [{ ...subscribed()[0], frequency: "off", unsubscribed_at: "2026-10-10T00:00:00Z" }];
  await callback(new Request("https://x.test/auth/callback?code=abc&subscribe=weekly&crafts=vfx"));
  assert.equal(prefsRow().frequency, "weekly");
  assert.equal(prefsRow().unsubscribed_at, null);
  assert.ok(prefsRow().consent_at > "2026-10-10T00:00:00Z");
});

console.error = origError;
console.warn = origWarn;
console.log(`${passed} checks passed`);
console.log(`Not covered offline (needs the live services): a real Resend send and delivery (SPF/DKIM on the
domain), Supabase sending the magic-link email and its PKCE exchange in a real browser, the Vercel Cron
schedule firing, and the form's loading/error states in a browser (checked by reading the code).`);
