// Shared search rules for /search, /people and the companies app (site/app.html mirrors craftOfQuery and fold).
import taxonomy from "@/schema/taxonomy.json";

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
    return Boolean(syn && syn.some((s) => hay.includes(s)));
  });
}
export const terms = (q) => fold(q).split(" ").filter(Boolean);
