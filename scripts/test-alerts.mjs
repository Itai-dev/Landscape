// Unit checks for alerts on followed companies: who gets which update, weekly timing, and that the
// daily run sends each update to each person at most once (also with two runs at the same time).
// Run after `npm run build` (needs lib/generated/orgs.json): node scripts/test-alerts.mjs
import { register } from "node:module";
import assert from "node:assert/strict";

register("./alias-hooks.mjs", import.meta.url);
const { alertItems, alertDue, recentSignals, seenDay } = await import("../lib/alerts.js");
const { runAlerts } = await import("../lib/alertsSend.js");
const { renderAlertEmail } = await import("../lib/alertsEmail.js");
const { default: dataset } = await import("../site/data/dataset.json", { with: { type: "json" } });

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);

const [A, B, C] = dataset.orgs.slice(0, 3).map((o) => o.id);
const sig = (id, org, date, extra = {}) => ({ id, type: "campaign", org_id: org, date, added: date, headline_he: `כותרת ${id}`, why_he: "למה", source: "ICE", source_url: "https://example.com", ...extra });
const NOW = new Date("2026-10-21T05:00:00Z"); // Wednesday, Israel

t("only updates on followed companies, seen on or after the follow day", () => {
  const signals = [sig("s1", A, "2026-10-20"), sig("s2", B, "2026-10-20"), sig("s3", A, "2026-10-15"), sig("s4", C, "2026-10-20", { related_ids: [A] })];
  const items = alertItems({ follows: [{ org_id: A, created_at: "2026-10-18T10:00:00Z" }], signals, base: "https://x" });
  assert.deepEqual(items.map((i) => i.id).sort(), ["s1", "s4"]);
  assert.equal(items.find((i) => i.id === "s4").org.id, A); // matched through related_ids
});

t("already sent updates are skipped", () => {
  const signals = [sig("s1", A, "2026-10-20"), sig("s2", A, "2026-10-19")];
  const items = alertItems({ follows: [{ org_id: A, created_at: "2026-10-01T00:00:00Z" }], signals, sent: new Set(["s1"]) });
  assert.deepEqual(items.map((i) => i.id), ["s2"]);
});

t("late arrivals count from the day they reached the directory", () => {
  const late = sig("s5", A, "2026-10-02", { added: "2026-10-20" });
  assert.equal(seenDay(late), "2026-10-20");
  const items = alertItems({ follows: [{ org_id: A, created_at: "2026-10-10T00:00:00Z" }], signals: [late] });
  assert.equal(items.length, 1);
  assert.equal(recentSignals({ now: NOW, signals: [late, sig("old", A, "2026-09-01")] }).length, 1);
});

t("weekly: the digest's Sunday plus two catch-up days, once a week", () => {
  const sun = new Date("2026-10-25T05:00:00Z"), tue = new Date("2026-10-27T05:00:00Z"), wed = new Date("2026-10-28T05:00:00Z");
  assert.equal(alertDue("daily", null, wed), true);
  assert.equal(alertDue("weekly", null, sun), true);
  assert.equal(alertDue("weekly", null, tue), true);
  assert.equal(alertDue("weekly", null, wed), false);
  assert.equal(alertDue("weekly", "2026-10-25T05:00:00Z", tue), false); // already sent this week
  assert.equal(alertDue("weekly", "2026-10-18T05:00:00Z", sun), true);
  assert.equal(alertDue("off", null, sun), false);
});

t("email: RTL, sender identity, unsubscribe link, plain text", () => {
  process.env.DIGEST_SENDER_NAME = "Test Sender"; process.env.DIGEST_SENDER_ADDRESS = "1 Test St"; process.env.NEXT_PUBLIC_PRIVACY_EMAIL = "privacy@example.com";
  const items = alertItems({ follows: [{ org_id: A, created_at: "2026-10-01T00:00:00Z" }], signals: [sig("s1", A, "2026-10-20")], base: "https://x" });
  const m = renderAlertEmail(items, { base: "https://x", unsubscribeUrl: "https://x/alerts/unsubscribe?u=1&t=2" });
  assert.match(m.html, /dir="rtl"/);
  assert.match(m.html, /Test Sender · 1 Test St/);
  assert.match(m.html, /alerts\/unsubscribe/);
  assert.match(m.text, /הפסקת ההתראות/);
  assert.ok(m.subject.includes("עדכון על"));
});

// --- A tiny in-memory stand-in for the Supabase client (only what runAlerts uses) --------------------------
function fakeDb({ recipients, follows }) {
  const tables = { alert_sends: [], digest_sends: [], signal_seen: [], newsletter_prefs: recipients.map((r) => ({ user_id: r.user_id })), org_follows: follows };
  const key = (r) => `${r.user_id}|${r.signal_id}`;
  function query(table) {
    const filters = [];
    let op = "select", payload = null, opts = {}, head = false;
    const q = {
      select(_cols, o = {}) { head = Boolean(o.head); return q; },
      eq(col, v) { filters.push((r) => r[col] === v); return q; },
      gte(col, v) { filters.push((r) => String(r[col] || "") >= String(v)); return q; },
      in(col, vs) { filters.push((r) => vs.includes(r[col])); return q; },
      upsert(rows, o) { op = "upsert"; payload = rows; opts = o; return q; },
      update(p) { op = "update"; payload = p; return q; },
      delete() { op = "delete"; return q; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    async function run() {
      await new Promise((r) => setTimeout(r, Math.random() * 3)); // interleave concurrent runs
      const rows = tables[table];
      const match = (r) => filters.every((f) => f(r));
      if (op === "select") return head ? { count: rows.filter(match).length, error: null } : { data: rows.filter(match), error: null };
      if (op === "upsert") {
        const inserted = [];
        for (const r of payload) if (!rows.some((x) => key(x) === key(r))) { rows.push({ ...r }); inserted.push(r); }
        return { data: inserted, error: null };
      }
      if (op === "update") { rows.filter(match).forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (op === "delete") { tables[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
    }
    return q;
  }
  return {
    tables,
    from: query,
    rpc: () => ({ range: async () => ({ data: recipients, error: null }) }),
  };
}

const sentEmails = [];
let failNext = false;
let timeoutNext = false;
const keys = [];
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /api\.resend\.com/);
  keys.push(init.headers["Idempotency-Key"]);
  if (failNext) { failNext = false; return new Response(JSON.stringify({ message: "boom" }), { status: 500 }); }
  if (timeoutNext) { timeoutNext = false; throw new TypeError("fetch failed"); }
  const batch = JSON.parse(init.body);
  sentEmails.push(...batch);
  return new Response(JSON.stringify({ data: batch.map((_, i) => ({ id: `m${sentEmails.length}-${i}` })) }), { status: 200 });
};
const SEND_ENV = { RESEND_API_KEY: "k", DIGEST_FROM: "Landscape <a@b.c>", DIGEST_SENDER_NAME: "S", DIGEST_SENDER_ADDRESS: "Addr", NEXT_PUBLIC_PRIVACY_EMAIL: "p@b.c", CRON_SECRET: "secret" };

function setup() {
  Object.assign(process.env, SEND_ENV);
  sentEmails.length = 0;
  const recipients = [
    { user_id: "u1", email: "one@example.com", alerts: "daily", alerts_last_sent_at: null },
    { user_id: "u2", email: "two@example.com", alerts: "daily", alerts_last_sent_at: null },
    { user_id: "u3", email: "three@example.com", alerts: "weekly", alerts_last_sent_at: null }, // not due on a Wednesday
  ];
  const follows = [
    { user_id: "u1", org_id: A, created_at: "2026-10-01T00:00:00Z" },
    { user_id: "u1", org_id: B, created_at: "2026-10-01T00:00:00Z" },
    { user_id: "u2", org_id: B, created_at: "2026-10-01T00:00:00Z" },
    { user_id: "u3", org_id: A, created_at: "2026-10-01T00:00:00Z" },
  ];
  const signals = [sig("s1", A, "2026-10-20"), sig("s2", B, "2026-10-20"), sig("s3", C, "2026-10-20")];
  return { db: fakeDb({ recipients, follows }), signals };
}

t("one email per person, bundling their updates; a second run sends nothing", async () => {
  const { db, signals } = setup();
  const r1 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r1.sent, 2);
  assert.equal(sentEmails.length, 2);
  const one = sentEmails.find((m) => m.to[0] === "one@example.com");
  assert.match(one.subject, /עדכונים/); // two updates in one email
  assert.ok(one.headers["List-Unsubscribe"].includes("/api/alerts/unsubscribe"));
  assert.equal(db.tables.alert_sends.filter((r) => r.status === "sent").length, 3);
  const r2 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r2.sent, 0);
  assert.equal(sentEmails.length, 2);
});

t("two runs at the same time send each update once", async () => {
  const { db, signals } = setup();
  await Promise.all([runAlerts(db, { now: NOW, signals }), runAlerts(db, { now: NOW, signals })]);
  const perUser = sentEmails.reduce((m, e) => m.set(e.to[0], (m.get(e.to[0]) || 0) + 1), new Map());
  assert.deepEqual([...perUser.values()], [1, 1]);
  const ids = sentEmails.flatMap((e) => (e.html.match(/כותרת s\d/g) || []).map((x) => `${e.to[0]}:${x}`));
  assert.equal(new Set(ids).size, ids.length);
});

t("a refused batch releases its claim, so tomorrow's run retries", async () => {
  const { db, signals } = setup();
  failNext = true;
  const r1 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r1.sent, 0);
  assert.equal(db.tables.alert_sends.length, 0);
  const r2 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r2.sent, 2);
});

t("nothing is sent without the full sender identity", async () => {
  const { db, signals } = setup();
  delete process.env.DIGEST_SENDER_ADDRESS;
  const r = await runAlerts(db, { now: NOW, signals });
  assert.equal(r.skipped, "missing_env");
  assert.equal(sentEmails.length, 0);
});

t("a refused batch releases only its own claims", async () => {
  const { db, signals } = setup();
  // Another run holds a claim on (u1, s1).
  db.tables.alert_sends.push({ user_id: "u1", signal_id: "s1", status: "pending", batch: "2026-10-21", claim: "other-run" });
  failNext = true;
  await runAlerts(db, { now: NOW, signals });
  assert.deepEqual(db.tables.alert_sends.map((r) => r.claim), ["other-run"]);
});

t("no answer from Resend keeps the claim: never sent twice", async () => {
  const { db, signals } = setup();
  timeoutNext = true;
  const r1 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r1.sent, 0);
  assert.ok(db.tables.alert_sends.length > 0);
  const r2 = await runAlerts(db, { now: NOW, signals });
  assert.equal(r2.sent, 0);
  assert.equal(sentEmails.length, 0);
});

t("the idempotency key depends on who and what, not on the day", async () => {
  const a = setup();
  keys.length = 0;
  await runAlerts(a.db, { now: NOW, signals: a.signals });
  const b = setup();
  await runAlerts(b.db, { now: new Date("2026-10-22T05:00:00Z"), signals: b.signals });
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.match(keys[0], /^alerts-[0-9a-f]{48}$/);
});

t("an update merged late still alerts once it first appears on the site", async () => {
  const { db, signals } = setup();
  // History already recorded, so this isn't the first run.
  db.tables.signal_seen.push({ signal_id: "old", first_seen_at: "2026-09-01T09:00:00Z" });
  const late = sig("late", A, "2026-09-02", { added: "2026-09-03" }); // dated long ago, merged now
  const r = await runAlerts(db, { now: NOW, signals: [...signals, late] });
  assert.ok(r.sent >= 1);
  assert.ok(sentEmails.some((m) => m.to[0] === "one@example.com" && m.text.includes("כותרת late")));
});

t("the first run records history and doesn't send old updates as new", async () => {
  const { db } = setup();
  const old = sig("hist", A, "2026-09-02", { added: "2026-09-03" });
  const r = await runAlerts(db, { now: NOW, signals: [old] });
  assert.equal(sentEmails.length, 0);
  assert.equal(db.tables.signal_seen.length, 1);
  assert.equal(r.note, "no_new_updates");
});

t("alerts stay inside the shared daily budget after the digest", async () => {
  const { db, signals } = setup();
  for (let i = 0; i < 99; i++) db.tables.digest_sends.push({ user_id: `d${i}`, status: "sent", created_at: "2026-10-21T04:00:00Z" });
  const r = await runAlerts(db, { now: NOW, signals });
  assert.equal(r.budget, 1);
  assert.equal(r.sent, 1);
});

for (const [name, fn] of tests) {
  await fn();
  passed++;
  console.log("ok", name);
}
console.log(`${passed} checks passed`);
