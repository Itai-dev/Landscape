// Shared search rules for /search, /people and the companies app (site/app.html mirrors craftOfQuery and fold).
import taxonomy from "@/schema/taxonomy.json";
import { soundsLike } from "@/lib/translit";

// Lowercase, no accents, no quote marks (״ " ׳ '), maqaf and hyphens as spaces.
export const fold = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[״"׳'`’]/g, "")
    .replace(/[־‐-―-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// A query that is exactly a craft's name (Hebrew, English or a common alias: "מושן", "motion", "VFX")
// is that craft, so every page counts the same companies for it.
const CRAFT_BY_NAME = new Map();
for (const slug of taxonomy.facets.craft) {
  for (const n of [taxonomy.categories[slug], taxonomy.categories_he?.[slug], ...(taxonomy.craft_aliases?.[slug] || [])]) {
    if (n) CRAFT_BY_NAME.set(fold(n), slug);
  }
}
export const craftOfQuery = (q) => CRAFT_BY_NAME.get(fold(q)) || "";

// A question in plain words ("מי מזמין מושן בתל אביב"): question words drop out, a craft's name becomes the
// craft, and "ב"/"ל" in front of a city ("בתל אביב") comes off, so the rest matches the companies' cities.
const QUESTION_WORDS = new Set(["מי", "מה", "איזה", "אילו", "מזמין", "מזמינה", "מזמינים", "מזמינות", "מחפש", "מחפשת", "מחפשים", "צריך", "צריכה", "צריכים", "של", "את", "עם", "גם", "למשל", "עכשיו"]);
const CITY_FIRST_WORDS = new Set(Object.entries(taxonomy.cities_he || {}).flatMap(([en, he]) => [fold(en).split(" ")[0], fold(he).split(" ")[0]]));
const unprefix = (w) => (/^[בלה]/.test(w) && w.length > 2 ? w.slice(1) : w);
export function parseQuery(q) {
  // Sentence punctuation isn't part of any name: "מי מזמין מושן בתל אביב?" is the same search without the "?".
  q = String(q || "").replace(/[?!,;]+/g, " ").trim();
  const words = fold(q).split(" ").filter(Boolean);
  if (words.length < 2) return { craft: craftOfQuery(q), q: craftOfQuery(q) ? "" : String(q || "").trim() };
  let craft = "";
  const rest = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (QUESTION_WORDS.has(w)) continue;
    if (!craft) {
      const two = words[i + 1] ? `${w} ${words[i + 1]}` : "";
      const hit = (two && (craftOfQuery(two) || craftOfQuery(unprefix(w) + " " + words[i + 1]))) || "";
      if (hit) { craft = hit; i++; continue; }
      const one = craftOfQuery(w) || craftOfQuery(unprefix(w));
      if (one) { craft = one; continue; }
    }
    rest.push(CITY_FIRST_WORDS.has(unprefix(w)) && !CITY_FIRST_WORDS.has(w) ? unprefix(w) : w);
  }
  return { craft, q: rest.join(" ") };
}

// Hebrew job titles → the words used in published titles (mostly English), so "מנכ״ל" finds "CEO".
const TITLE_SYNONYMS = {
  "מנכל": ["ceo", "chief executive", "managing director"], "מנכלית": ["ceo", "chief executive", "managing director"],
  "סמנכל": ["vp", "vice president", "svp", "evp"], "סמנכלית": ["vp", "vice president", "svp", "evp"],
  "מנהל": ["manager", "head", "director", "ceo", "chief", "vp", "lead", "management"], "מנהלת": ["manager", "head", "director", "ceo", "chief", "vp", "lead", "management"],
  "ניהול": ["manager", "management", "head", "director"],
  "מפיק": ["producer", "production"], "מפיקה": ["producer", "production"], "הפקה": ["producer", "production"], "הפקות": ["producer", "production"],
  "במאי": ["director"], "במאית": ["director"], "בימוי": ["director"],
  "מייסד": ["founder"], "מייסדת": ["founder"], "מייסדים": ["founder"], "ייסוד": ["founder"],
  "שותף": ["partner"], "שותפה": ["partner"],
  "יור": ["chairman", "chairwoman", "chair", "president"],
  "מעצב": ["designer", "design"], "מעצבת": ["designer", "design"], "עיצוב": ["design"],
  "שיווק": ["marketing", "cmo", "brand"], "קריאייטיב": ["creative"], "יצירתי": ["creative"],
  "עורך": ["editor"], "עורכת": ["editor"], "עריכה": ["editor", "editing"],
  "אנימטור": ["animat"], "אנימטורית": ["animat"], "אנימציה": ["animat"],
  "סאונד": ["sound"], "צלם": ["photograph", "cinematograph", "dop"], "צלמת": ["photograph", "cinematograph", "dop"],
  "תוכן": ["content"], "דיגיטל": ["digital"], "מותג": ["brand"], "אסטרטגיה": ["strategy", "strategist"],
  "קופירייטר": ["copywriter", "copy"], "קופירייטרית": ["copywriter", "copy"], "טכנולוגיה": ["technology", "cto"],
};
const PREFIX = /^[הוב]/; // "המנכל", "ומפיק"

// Every word must appear in the text, as itself or as one of its title synonyms.
export function termsMatch(terms, hay) {
  return terms.every((t) => {
    if (hay.includes(t)) return true;
    const syn = TITLE_SYNONYMS[t] || (PREFIX.test(t) && TITLE_SYNONYMS[t.slice(1)]);
    if (syn && syn.some((s) => hay.includes(s))) return true;
    // A Hebrew spelling of a name we only have in English ("עמית" → Amit).
    return soundsLike(t, hay);
  });
}
export const terms = (q) => fold(q).split(" ").filter(Boolean);
