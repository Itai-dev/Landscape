// Unit checks for premium: plan limits, when a subscription counts, provider events applied once, the test
// provider's signature, list export (CSV) and "instant" alerts going only to premium accounts.
// Run after `npm run build` (needs lib/generated/*.json): node scripts/test-premium.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

// Premium is decided when the modules load, so switch it on first.
process.env.NEXT_PUBLIC_PREMIUM = "on";
process.env.BILLING_PROVIDER = "test";
process.env.BILLING_WEBHOOK_SECRET = "whsec";
Object.assign(process.env, { BUSINESS_NAME: "Test Biz", BUSINESS_ID: "000000018", BUSINESS_ADDRESS: "1 Test St", NEXT_PUBLIC_PRIVACY_EMAIL: "p@b.c" });
delete process.env.VERCEL_ENV;

register("./alias-hooks.mjs", import.meta.url);
const { followLimit, FREE_FOLLOWS, PREMIUM_FOLLOWS, shekels, cancelOutcome, addMonths } = await import("../lib/premium.js");
const { isActive, planOf, GRACE_DAYS } = await import("../lib/subscription.js");
const { cancelPlan } = await import("../lib/billing/cancel.js");
const { runRenewalNotices } = await import("../lib/renewals.js");
const { addFollows, setAlerts } = await import("../lib/follows.js");
const { applyEvents } = await import("../lib/billing/apply.js");
const { provider, billingReady } = await import("../lib/billing/index.js");
const test = await import("../lib/billing/test.js");
const { cell, exportCsv } = await import("../lib/exportCsv.js");
const { runAlerts } = await import("../lib/alertsSend.js");
const { default: dataset } = await import("../site/data/dataset.json", { with: { type: "json" } });

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const DAY = 864e5;
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ORG_IDS = dataset.orgs.map((o) => o.id);

// --- In-memory stand-in for the Supabase client (only what these modules use) --------------------------
const KEYS = {
  org_follows: (r) => `${r.user_id}|${r.org_id}`, subscriptions: (r) => r.user_id, billing_events: (r) => r.id,
  alert_sends: (r) => `${r.user_id}|${r.signal_id}`, newsletter_prefs: (r) => r.user_id, signal_seen: (r) => r.signal_id, digest_sends: (r) => r.user_id,
};
function fakeDb(seed = {}, recipients = []) {
  const tables = { org_follows: [], subscriptions: [], billing_events: [], alert_sends: [], newsletter_prefs: [], signal_seen: [], digest_sends: [], terms_acceptances: [], ...seed };
  function query(table) {
    const filters = [];
    let op = "select", payload = null, opts = {}, head = false, single = false, back = false;
    const q = {
      select(_c, o = {}) { if (op !== "select") back = true; head = Boolean(o.head); return q; },
      eq(c, v) { filters.push((r) => r[c] === v); return q; },
      gte(c, v) { filters.push((r) => String(r[c] || "") >= String(v)); return q; },
      lte(c, v) { filters.push((r) => String(r[c] || "") <= String(v)); return q; },
      in(c, vs) { filters.push((r) => vs.includes(r[c])); return q; },
      order() { return q; },
      maybeSingle() { single = true; return q; },
      upsert(rows, o = {}) { op = "upsert"; payload = [].concat(rows); opts = o; return q; },
      insert(rows) { op = "insert"; payload = [].concat(rows); return q; },
      update(p) { op = "update"; payload = p; return q; },
      delete() { op = "delete"; return q; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    function run() {
      const rows = tables[table];
      const key = KEYS[table] || ((r) => JSON.stringify(r));
      const match = (r) => filters.every((f) => f(r));
      if (op === "select") {
        const found = rows.filter(match);
        if (head) return { count: found.length, error: null };
        return { data: single ? found[0] || null : found, error: null };
      }
      if (op === "upsert" || op === "insert") {
        const inserted = [];
        for (const r of payload) {
          const i = rows.findIndex((x) => key(x) === key(r));
          if (i < 0) { rows.push({ ...r }); inserted.push(r); }
          else if (op === "upsert" && !opts.ignoreDuplicates) { rows[i] = { ...rows[i], ...r }; inserted.push(r); }
        }
        return { data: back ? inserted : null, error: null };
      }
      if (op === "update") { rows.filter(match).forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (op === "delete") { tables[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
    }
    return q;
  }
  const auth = { admin: { getUserById: async (id) => ({ data: { user: { id, email: `${id.slice(-4)}@example.com` } }, error: null }) } };
  return { tables, auth, from: query, rpc: () => ({ range: async () => ({ data: recipients, error: null }) }) };
}
const future = (days = 20) => new Date(Date.now() + days * DAY).toISOString();
const past = (days = 1) => new Date(Date.now() - days * DAY).toISOString();
const sub = (user_id, extra = {}) => ({ user_id, status: "active", plan: "monthly", provider: "test", provider_ref: "r", current_period_end: future(), cancel_at_period_end: false, ...extra });

// --- limits and plan state ---------------------------------------------------------------------------
t("free tier is 10 companies, premium is unlimited (500)", () => {
  assert.equal(FREE_FOLLOWS, 10);
  assert.equal(followLimit(false), 10);
  assert.equal(followLimit(true), PREMIUM_FOLLOWS);
  assert.equal(shekels(29), "29 ₪");
});

t("a subscription counts while paid up, through a cancelled period and a short grace after a failed renewal", () => {
  assert.equal(isActive(sub("a")), true);
  assert.equal(isActive(sub("a", { current_period_end: past() })), false);
  assert.equal(isActive(sub("a", { status: "canceled" })), true);
  assert.equal(isActive(sub("a", { status: "canceled", current_period_end: past() })), false);
  assert.equal(isActive(sub("a", { status: "past_due", current_period_end: past(GRACE_DAYS - 1) })), true);
  assert.equal(isActive(sub("a", { status: "past_due", current_period_end: past(GRACE_DAYS + 1) })), false);
  assert.equal(isActive(sub("a", { status: "expired" })), false);
  assert.equal(isActive(null), false);
});

t("free accounts stop at 10; companies already followed stay; premium accounts keep adding", async () => {
  const free = U(1), paid = U(2);
  const db = fakeDb({
    org_follows: ORG_IDS.slice(0, 9).map((org_id) => ({ user_id: free, org_id, created_at: past() })),
    subscriptions: [sub(paid)],
  });
  const r1 = await addFollows(db, free, ORG_IDS.slice(9, 12));
  assert.deepEqual([r1.ok, r1.added, r1.limit, r1.max], [true, 1, true, 10]);
  const r2 = await addFollows(db, free, [ORG_IDS[20]]);
  assert.deepEqual([r2.added, r2.limit], [0, true]);
  const r3 = await addFollows(db, paid, ORG_IDS.slice(0, 30));
  assert.deepEqual([r3.added, r3.limit], [30, false]);
  assert.equal((await planOf(db, paid)).premium, true);
  assert.equal((await planOf(db, free)).limit, 10);
});

t("instant alerts need premium", async () => {
  const db = fakeDb({ newsletter_prefs: [{ user_id: U(3), alerts: "daily", alerts_consent_at: past() }] });
  const user = { id: U(3), email: "a@b.c", email_confirmed_at: past() };
  assert.equal((await setAlerts(db, user, { mode: "instant" })).error, "premium_required");
  assert.equal((await setAlerts(db, user, { mode: "instant", premium: true })).ok, true);
});

// --- payment events ----------------------------------------------------------------------------------
t("provider events: paid activates, a repeat delivery is skipped, cancel keeps the period, failed is past due", async () => {
  const db = fakeDb();
  const u = U(4);
  let r = await applyEvents(db, "test", [{ id: "e1", kind: "paid", userId: u, plan: "yearly", ref: "sub_1" }]);
  assert.equal(r.applied, 1);
  const row = db.tables.subscriptions[0];
  assert.equal(row.status, "active");
  assert.ok(new Date(row.current_period_end) - Date.now() > 360 * DAY);
  r = await applyEvents(db, "test", [{ id: "e1", kind: "paid", userId: u, plan: "yearly" }]);
  assert.deepEqual([r.applied, r.repeats], [0, 1]);
  await applyEvents(db, "test", [{ id: "e2", kind: "canceled", userId: u }]);
  assert.equal(db.tables.subscriptions[0].status, "canceled");
  assert.equal((await planOf(db, u)).premium, true); // still paid up
  await applyEvents(db, "test", [{ id: "e3", kind: "failed", userId: u }]);
  assert.equal(db.tables.subscriptions[0].status, "canceled"); // past due applies only to an active plan
  r = await applyEvents(db, "test", [{ id: "e4", kind: "paid", userId: "not-a-user", plan: "monthly" }, { id: "e5", kind: "nope", userId: u }]);
  assert.equal(r.skipped, 2);
});

t("the test provider: preview only, and its webhook needs a valid signature", async () => {
  assert.equal(billingReady(), true);
  assert.equal(provider().name, "test");
  const raw = JSON.stringify({ id: "x1", kind: "paid", userId: U(5), plan: "monthly" });
  const good = new Headers({ "x-billing-signature": test.sign(raw) });
  const bad = new Headers({ "x-billing-signature": test.sign(raw, "other") });
  assert.equal((await test.events({ raw, headers: good }))[0].userId, U(5));
  assert.equal(await test.events({ raw, headers: bad }), null);
  process.env.VERCEL_ENV = "production";
  assert.equal(provider(), null); // never in production
  delete process.env.VERCEL_ENV;
});


// --- cancelling and refunds --------------------------------------------------------------------------
t("cancel rules: full refund within 14 days, yearly pays back the months not started, monthly runs out", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const joined = (days) => new Date(now.getTime() - days * DAY).toISOString();
  const full = cancelOutcome({ plan: "monthly", amount: 29, started_at: joined(3), period_start: joined(3), current_period_end: future() }, now);
  assert.deepEqual([full.kind, full.refund, full.until], ["full", 29, now.toISOString()]);
  // Yearly, joined 3.5 months ago: month 4 has started, 8 months come back.
  const start = new Date("2026-03-01T00:00:00Z");
  const y = { plan: "yearly", amount: 290, started_at: start.toISOString(), period_start: start.toISOString(), current_period_end: addMonths(start, 12).toISOString() };
  const pr = cancelOutcome(y, now);
  assert.deepEqual([pr.kind, pr.months, pr.refund, pr.until], ["prorata", 8, 193.33, addMonths(start, 4).toISOString()]);
  const last = cancelOutcome(y, new Date(addMonths(start, 11).getTime() + DAY)); // in the last month
  assert.equal(last.kind, "none");
  const monthly = cancelOutcome({ plan: "monthly", amount: 29, started_at: joined(40), period_start: joined(10), current_period_end: future(20) }, now);
  assert.deepEqual([monthly.kind, monthly.refund], ["none", 0]);
});

t("a new plan gets one confirmation email; a renewal keeps the start date and sends none", async () => {
  Object.assign(process.env, { RESEND_API_KEY: "k", DIGEST_FROM: "L <a@b.c>", DIGEST_SENDER_NAME: "S", DIGEST_SENDER_ADDRESS: "Addr" });
  const sent = [];
  globalThis.fetch = async (_url, init) => { const b = JSON.parse(init.body); sent.push(...b); return new Response(JSON.stringify({ data: b.map((_, i) => ({ id: `m${i}` })) }), { status: 200 }); };
  const db = fakeDb();
  const u = U(20);
  await applyEvents(db, "test", [{ id: "c1", kind: "paid", userId: u, plan: "monthly", ref: "r", amount: 29 }]);
  const started = db.tables.subscriptions[0].started_at;
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /הפרימיום פעיל/);
  assert.match(sent[0].text, /עוסק פטור 000000018/);
  assert.match(sent[0].text, /מחזיר את כל הסכום/);
  await new Promise((r) => setTimeout(r, 5));
  await applyEvents(db, "test", [{ id: "c2", kind: "paid", userId: u, plan: "monthly", ref: "r", amount: 29 }]);
  assert.equal(sent.length, 1);
  assert.equal(db.tables.subscriptions[0].started_at, started);
});

t("cancelling within 14 days refunds and ends premium now; payments (and the free limit) need the business details", async () => {
  const u = U(21);
  const db = fakeDb({ subscriptions: [sub(u, { amount: 29, started_at: past(2), period_start: past(2) })] });
  const out = await cancelPlan(db, u, db.tables.subscriptions[0]);
  assert.deepEqual([out.ok, out.kind, out.refund, out.refunded], [true, "full", 29, true]);
  const row = db.tables.subscriptions[0];
  assert.deepEqual([row.status, row.refund_amount, row.refund_due], ["canceled", 29, false]);
  assert.equal((await planOf(db, u)).premium, false);
  const id = process.env.BUSINESS_ID;
  delete process.env.BUSINESS_ID;
  assert.equal(billingReady(), false);
  // Before payments open, premium is a waitlist and the free tier keeps the old cap of 100.
  const waiting = await planOf(fakeDb(), U(22));
  assert.deepEqual([waiting.paywall, waiting.limit], [false, 100]);
  process.env.BUSINESS_ID = id;
  assert.deepEqual([(await planOf(fakeDb(), U(22))).limit], [10]);
  assert.equal(billingReady(), true);
});

t("yearly plans get one renewal reminder, 30 days ahead; monthly and cancelled plans none", async () => {
  const sent = [];
  globalThis.fetch = async (_url, init) => { const b = JSON.parse(init.body); sent.push(...b); return new Response(JSON.stringify({ data: b.map((_, i) => ({ id: `m${i}` })) }), { status: 200 }); };
  const db = fakeDb({ subscriptions: [
    sub(U(30), { plan: "yearly", current_period_end: future(20) }),
    sub(U(31), { plan: "yearly", current_period_end: future(60) }),
    sub(U(32), { plan: "monthly", current_period_end: future(20) }),
    sub(U(33), { plan: "yearly", status: "canceled", cancel_at_period_end: true, current_period_end: future(20) }),
  ] });
  const r1 = await runRenewalNotices(db);
  assert.deepEqual([r1.due, r1.sent], [1, 1]);
  assert.match(sent[0].subject, /מתחדש/);
  const r2 = await runRenewalNotices(db);
  assert.equal(r2.due, 0);
});

// --- export ------------------------------------------------------------------------------------------
t("CSV: Excel-safe cells, Hebrew header, filters", () => {
  assert.equal(cell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(cell('a, "b"'), '"a, ""b"""');
  const all = exportCsv("companies");
  assert.ok(all.csv.startsWith("﻿שם,סוג"));
  const agencies = exportCsv("companies", { kind: "agency" });
  assert.ok(agencies.count > 0 && agencies.count < all.count);
  const mine = exportCsv("companies", { ids: ORG_IDS.slice(0, 3) });
  assert.equal(mine.count, 3);
  const people = exportCsv("people");
  assert.ok(people.count > 0);
  assert.ok(people.csv.split("\r\n").slice(1, -1).every((line) => /https?:/.test(line)), "every person row has its source");
});

// --- instant alerts ----------------------------------------------------------------------------------
t("the hourly run sends only to premium accounts that chose instant", async () => {
  Object.assign(process.env, { RESEND_API_KEY: "k", DIGEST_FROM: "L <a@b.c>", DIGEST_SENDER_NAME: "S", DIGEST_SENDER_ADDRESS: "Addr", NEXT_PUBLIC_PRIVACY_EMAIL: "p@b.c", CRON_SECRET: "s" });
  const sent = [];
  globalThis.fetch = async (_url, init) => {
    const batch = JSON.parse(init.body);
    sent.push(...batch);
    return new Response(JSON.stringify({ data: batch.map((_, i) => ({ id: `m${i}` })) }), { status: 200 });
  };
  const [A] = ORG_IDS;
  const people = [U(10), U(11), U(12)];
  const recipients = [
    { user_id: people[0], email: "paid@example.com", alerts: "instant", alerts_last_sent_at: null },
    { user_id: people[1], email: "lapsed@example.com", alerts: "instant", alerts_last_sent_at: null },
    { user_id: people[2], email: "daily@example.com", alerts: "daily", alerts_last_sent_at: null },
  ];
  const db = fakeDb({
    org_follows: people.map((user_id) => ({ user_id, org_id: A, created_at: "2026-10-01T00:00:00Z" })),
    subscriptions: [sub(people[0])],
    signal_seen: [{ signal_id: "seed", first_seen_at: "2026-01-01T00:00:00Z" }],
  }, recipients);
  const now = new Date();
  const today = new Date(now.getTime() + 3 * 3600e3).toISOString().slice(0, 10);
  const signals = [{ id: "s1", type: "campaign", org_id: A, date: today, added: today, headline_he: "כותרת", why_he: "למה", source: "ICE", source_url: "https://example.com" }];
  const r = await runAlerts(db, { now, signals, only: "instant" });
  assert.equal(r.sent, 1);
  assert.deepEqual(sent.map((m) => m.to[0]), ["paid@example.com"]);
  const daily = await runAlerts(db, { now, signals });
  assert.equal(daily.sent, 2); // the lapsed one and the daily one; the paid one already has it
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log("ok  ", name); }
  catch (e) { console.error("FAIL", name, "\n", e); process.exitCode = 1; }
}
console.log(`${passed}/${tests.length} premium checks passed`);
