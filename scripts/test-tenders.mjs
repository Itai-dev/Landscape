// Checks for tender states: open / upcoming (published, submissions not open yet) / closed / cancelled,
// at the exact boundaries in Israel time, across the October 2026 switch from summer time (UTC+3) to
// winter time (UTC+2) on Sunday 25 Oct at 02:00.
// Run after `npm run build` (reads site/data/tenders.json): node scripts/test-tenders.mjs
import { register } from "node:module";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);
const { stateOf, countdown, listTenders, tenderCounts } = await import("../lib/tenders.js");
const { default: file } = await import("../site/data/tenders.json", { with: { type: "json" } });

let passed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const at = (iso) => new Date(iso);
// A tender row as the build writes it (UTC instants already converted from Israel time).
const row = (extra) => ({ id: "x", status: "open", deadline_at: "2026-11-15T12:00", deadline_utc: "2026-11-15T10:00+00:00", ...extra });

// The build (scripts/landscape.py) turns Israel local time into UTC; ask it directly.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const py = (expr) => execFileSync("python3", ["-c", `import sys; sys.path.insert(0, 'scripts'); import landscape as L; print(${expr})`], { cwd: ROOT, encoding: "utf8" }).trim();

t("build converts Israel time to UTC on both sides of the DST switch", () => {
  assert.equal(py(`L.tender_deadline_utc({'deadline_at': '2026-10-25T12:00'}).isoformat(timespec='minutes')`), "2026-10-25T10:00+00:00"); // winter, +2
  assert.equal(py(`L.tender_deadline_utc({'deadline_at': '2026-10-24T12:00'}).isoformat(timespec='minutes')`), "2026-10-24T09:00+00:00"); // summer, +3
  assert.equal(py(`L.tender_deadline_utc({'deadline_at': '2026-07-14T15:00'}).isoformat(timespec='minutes')`), "2026-07-14T12:00+00:00");
  assert.equal(py(`L.tender_deadline_utc({'deadline_at': '2026-11-15'}).isoformat(timespec='minutes')`), "2026-11-15T21:59+00:00"); // end of day
  assert.equal(py(`L.tender_opens_utc({'submission_opens': '2026-11-11'}).isoformat(timespec='minutes')`), "2026-11-10T22:00+00:00"); // start of day
});

t("build state: upcoming before submissions open, open until the deadline, then closed; cancelled wins", () => {
  const T = `{'status': 'open', 'submission_opens': '2026-10-19T08:00', 'deadline_at': '2026-10-25T12:00'}`;
  const st = (now) => py(`L.tender_state(${T}, L.dt.datetime.fromisoformat('${now}'))`);
  assert.equal(st("2026-10-19T04:59+00:00"), "upcoming"); // 07:59 Israel (summer)
  assert.equal(st("2026-10-19T05:00+00:00"), "open");
  assert.equal(st("2026-10-25T09:59+00:00"), "open"); // 11:59 Israel (winter)
  assert.equal(st("2026-10-25T10:00+00:00"), "closed");
  assert.equal(py(`L.tender_state({'status': 'cancelled', 'deadline_at': '2030-01-01'})`), "cancelled");
});

t("site state matches at the boundaries", () => {
  const r = row({ submission_opens: "2026-11-11T12:00", opens_utc: "2026-11-11T10:00+00:00" });
  assert.equal(stateOf(r, at("2026-11-11T09:59Z")), "upcoming");
  assert.equal(stateOf(r, at("2026-11-11T10:00Z")), "open");
  assert.equal(stateOf(r, at("2026-11-15T09:59Z")), "open");
  assert.equal(stateOf(r, at("2026-11-15T10:00Z")), "closed");
  assert.equal(stateOf({ ...r, status: "cancelled" }, at("2026-11-12T00:00Z")), "cancelled");
  assert.equal(stateOf({ ...r, status: "closed" }, at("2026-11-12T00:00Z")), "closed"); // closed as published
  assert.equal(stateOf(row({}), at("2026-11-01T00:00Z")), "open"); // no opening date: open until the deadline
});

t("upcoming tenders never read as open", () => {
  const r = row({ submission_opens: "2026-11-11T12:00", opens_utc: "2026-11-11T10:00+00:00" });
  const c = countdown(r, at("2026-10-21T08:00Z"));
  assert.equal(c.tone, "upcoming");
  assert.match(c.text, /^ההגשה נפתחת ב־11\.11$/);
  assert.doesNotMatch(c.text, /פתוח|נשארו/);
});

t("countdown days follow the Israel calendar day", () => {
  const r = row({ deadline_at: "2026-10-25T12:00", deadline_utc: "2026-10-25T10:00+00:00" });
  assert.equal(countdown(r, at("2026-10-24T20:59Z")).text, "נסגר מחר"); // 23:59 Israel on the 24th
  assert.equal(countdown(r, at("2026-10-24T21:00Z")).text, "נסגר היום"); // 00:00 Israel on the 25th (still summer time)
  assert.equal(countdown(r, at("2026-10-25T10:00Z")).text, "נסגר");
});

t("the published data: lists and counts keep upcoming apart from open", () => {
  const upcoming = file.tenders.filter((x) => x.opens_utc);
  assert.ok(upcoming.length > 0, "site data carries opening times");
  const now = at("2026-10-21T08:00Z");
  const live = listTenders({ now });
  const states = live.map((x) => x.state);
  assert.ok(states.every((s) => s === "open" || s === "upcoming"));
  assert.deepEqual(states, [...states].sort((a, b) => (a === b ? 0 : a === "open" ? -1 : 1)), "open first, then upcoming");
  const counts = tenderCounts(now);
  assert.equal(counts.open + counts.upcoming, live.length);
  for (const x of live.filter((y) => y.state === "upcoming")) assert.match(x.when, /^ההגשה נפתחת ב־/);
  for (const x of live.filter((y) => y.state === "open")) assert.match(x.when, /^הגשה עד /);
  // After everything's deadline, nothing is live.
  assert.equal(listTenders({ now: at("2031-01-01T00:00Z") }).length, 0);
});

for (const [name, fn] of tests) {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✗ ${name}\n  ${e.message}`);
    process.exitCode = 1;
  }
}
console.log(`${passed}/${tests.length} checks passed`);
