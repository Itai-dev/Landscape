// Premium: what it costs, what it adds, and the tracking limits. Safe on server and browser (no secrets).
// One switch: PREMIUM in lib/chrome.mjs (NEXT_PUBLIC_PREMIUM=on). Off, tracking keeps its old cap of 100
// for everyone and no page mentions premium.
import { PREMIUM } from "./chrome.mjs";

export { PREMIUM };
export const FREE_FOLLOWS = 10;
export const PREMIUM_FOLLOWS = 500; // "unlimited" for people; a ceiling for the database
export const LEGACY_FOLLOWS = 100;  // the cap while premium is off

// Prices in shekels, VAT included. The yearly plan is two months free.
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
