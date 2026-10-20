// When editions go out, and how a period is named. No data imports, so client components can use it.
const DAY = 864e5;

export const PERIOD_DAYS = { weekly: 7, biweekly: 14, monthly: 31 };
export const FREQUENCIES = ["weekly", "biweekly", "monthly"];

// Titles and wording per frequency. The product is "השבוע בתעשייה"; longer periods say so.
export const PERIOD = {
  weekly: { title: "השבוע בתעשייה", span: "השבוע", since: "מה השתנה השבוע", updates: "עדכונים מהשבוע" },
  biweekly: { title: "השבועיים בתעשייה", span: "בשבועיים האחרונים", since: "מה השתנה בשבועיים האחרונים", updates: "עדכונים מהשבועיים האחרונים" },
  monthly: { title: "החודש בתעשייה", span: "החודש", since: "מה השתנה החודש", updates: "עדכונים מהחודש" },
};
export const frequencyOfDays = (days) => (days >= 28 ? "monthly" : days >= 14 ? "biweekly" : "weekly");
export const periodOf = (frequency) => PERIOD[frequency] || PERIOD.weekly;

const ilDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d); // YYYY-MM-DD
export const utcDay = (iso) => new Date(`${iso}T00:00:00Z`);
export const isoOf = (d) => d.toISOString().slice(0, 10);
export const todayIL = (now = new Date()) => ilDate(now);

export const fmtDay = (iso) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" }).format(utcDay(iso));

// "13–20 באוק׳", or "28 בספט׳–4 באוק׳" across months. The day numbers are wrapped in a left-to-right
// isolate (U+2066…U+2069) so right-to-left text doesn't show them as "20–13".
export function fmtRange(from, to) {
  const a = utcDay(from), b = utcDay(to);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    const month = fmtDay(to).replace(/^\d+\s*/, "");
    return `\u2066${a.getUTCDate()}–${b.getUTCDate()}\u2069 ${month}`;
  }
  return `${fmtDay(from)}–${fmtDay(to)}`;
}

// The edition a moment belongs to: the Sunday on or before it, in Israel.
export function editionOf(now = new Date()) {
  const d = utcDay(ilDate(now));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return isoOf(d);
}

// Is a reader with this frequency due for this edition? Weekly: every Sunday. Biweekly: every other Sunday
// (counted from a fixed Sunday). Monthly: the first Sunday of the month.
const EPOCH_SUNDAY = utcDay("2026-01-04");
export function dueFor(frequency, edition) {
  const d = utcDay(edition);
  if (frequency === "weekly") return true;
  if (frequency === "biweekly") return Math.round((d - EPOCH_SUNDAY) / (7 * DAY)) % 2 === 0;
  if (frequency === "monthly") return d.getUTCDate() <= 7;
  return false;
}

// The first Sunday after `now` on which this frequency gets an edition (ISO date).
export function nextSendDay(frequency, now = new Date()) {
  const d = utcDay(editionOf(now));
  for (let i = 1; i <= 10; i++) {
    d.setUTCDate(d.getUTCDate() + 7);
    if (dueFor(frequency, isoOf(d))) return isoOf(d);
  }
  return null;
}

// "עד יום ראשון, 25 באוק׳" for the first edition someone will get (the current edition can still
// arrive earlier, in the two catch-up days after a Sunday).
export function firstSendLabel(frequency, now = new Date()) {
  const day = nextSendDay(frequency, now);
  return day ? `עד יום ראשון, ${fmtDay(day)}` : "באחד מימי ראשון הקרובים";
}
