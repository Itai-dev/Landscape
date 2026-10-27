// Premium: what it costs, what it adds, and the tracking limits. Safe on server and browser (no secrets).
// One switch: PREMIUM in lib/chrome.mjs (NEXT_PUBLIC_PREMIUM=on). Off, tracking keeps its old cap of 100
// for everyone and no page mentions premium.
import { PREMIUM } from "./chrome.mjs";

export { PREMIUM };
export const FREE_FOLLOWS = 10;
export const PREMIUM_FOLLOWS = 500; // "unlimited" for people; a ceiling for the database
export const LEGACY_FOLLOWS = 100;  // the cap while premium is off

// Prices in shekels. The business is an exempt dealer (עוסק פטור): no VAT is charged, the price is final, and
// each payment gets a receipt. If it becomes a licensed dealer, update TAX (and decide whether prices change).
export const TAX = { note: "המחיר סופי.", receipt: "קבלה" };
// The yearly plan is two months free.
export const PLANS = {
  monthly: { slug: "monthly", price: 29, label: "חודשי", per: "לחודש", months: 1 },
  yearly: { slug: "yearly", price: 290, label: "שנתי", per: "לשנה", months: 12, note: "חודשיים מתנה" },
};
export const isPlan = (v) => typeof v === "string" && Object.hasOwn(PLANS, v);

// What premium adds, in the order the pricing page lists them.
export const BENEFITS = [
  { key: "follows", title: "מעקב בלי הגבלה", text: `בחינם אפשר לעקוב אחרי עד ${FREE_FOLLOWS} חברות. בפרימיום, כמה שרוצים.` },
  { key: "instant", title: "התראות מיידיות", text: "מייל בתוך שעה מהרגע שעדכון על חברה במעקב שלכם עולה לאתר, במקום פעם ביום." },
  { key: "export", title: "ייצוא רשימות", text: "הורדת חברות ואנשי מפתח לקובץ CSV, לפי תחום, עיר וסוג חברה." },
  { key: "ai", title: "חיפוש עם AI", text: "שאלות במילים שלכם על החברות והאנשים בתעשייה, עם תשובה ומקורות." },
];

/** How many companies someone can keep in their tracking list. */
export function followLimit(isPremium) {
  if (!PREMIUM) return LEGACY_FOLLOWS;
  return isPremium ? PREMIUM_FOLLOWS : FREE_FOLLOWS;
}

// "29 ₪" (number, space, shekel sign: team/HEBREW.md).
export const shekels = (n) => `${Number(n).toLocaleString("he-IL")} ₪`;

// The terms people accept at checkout. Bump the date when /terms changes in substance.
export const TERMS_VERSION = "2026-10-27";

// --- Cancelling: what happens to the money and the plan (the rules /terms states) --------------------------
// • Within REFUND_DAYS of joining: the whole payment comes back and premium ends now.
// • A yearly plan after that: the months not yet started come back (pro rata of what was paid), and premium
//   runs to the end of the month already started.
// • A monthly plan after that: no more charges, and premium runs to the end of the paid month.
export const REFUND_DAYS = 14;
const DAY = 864e5;

export function addMonths(at, n) {
  const d = new Date(at);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

/** { kind: "full" | "prorata" | "none", refund (₪), until (ISO), months (pro rata only) } for cancelling now. */
export function cancelOutcome(sub, now = new Date()) {
  const t = new Date(now).getTime();
  const end = new Date(sub?.current_period_end || now);
  const amount = Number(sub?.amount) || PLANS[sub?.plan]?.price || 0;
  const started = new Date(sub?.started_at || NaN).getTime();
  if (Number.isFinite(started) && t >= started && t - started <= REFUND_DAYS * DAY) {
    return { kind: "full", refund: amount, until: new Date(t).toISOString(), months: 0 };
  }
  if (sub?.plan === "yearly") {
    const months = PLANS.yearly.months;
    const start = sub.period_start ? new Date(sub.period_start) : addMonths(end, -months);
    let used = 1; // the month already started counts as used
    while (used < months && addMonths(start, used).getTime() < t) used++;
    const left = months - used;
    if (left > 0) {
      const until = addMonths(start, used);
      return { kind: "prorata", refund: Math.round((amount * left * 100) / months) / 100, until: (until < end ? until : end).toISOString(), months: left };
    }
  }
  return { kind: "none", refund: 0, until: end.toISOString(), months: 0 };
}
