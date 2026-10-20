import taxonomy from "@/schema/taxonomy.json";

export const CRAFTS = taxonomy.facets.craft.map((slug) => ({ slug, he: taxonomy.categories_he[slug] || slug }));
export const CRAFT_SLUGS = CRAFTS.map((c) => c.slug);
export const craftLabel = (slug) => taxonomy.categories_he[slug] || slug;

export const CITIES = [...new Set(Object.values(taxonomy.cities_he || {}))].sort((a, b) => a.localeCompare(b, "he"));

export const OPEN_TO = [
  { slug: "freelance", he: "פרילנס ופרויקטים" },
  { slug: "fulltime", he: "משרה מלאה" },
  { slug: "collabs", he: "שיתופי פעולה" },
  { slug: "hiring", he: "מגייסים אנשים" },
];
export const OPEN_TO_SLUGS = OPEN_TO.map((o) => o.slug);
export const openToLabel = (slug) => OPEN_TO.find((o) => o.slug === slug)?.he || slug;

export const VISIBILITY = [
  { slug: "public", he: "ציבורי", hint: "כל מי שנכנס לאתר." },
  { slug: "members", he: "חברי קהילה בלבד", hint: "רק מי שנרשם ומחובר." },
  { slug: "hidden", he: "מוסתר", hint: "רק לבעלי הפרופיל. אפשר לפרסם אחר כך." },
];

export const FREQUENCIES = [
  { slug: "weekly", he: "פעם בשבוע" },
  { slug: "biweekly", he: "פעם בשבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
  { slug: "off", he: "בלי ניוזלטר" },
];

export const TOPICS = [
  { slug: "signals", he: "עדכוני שוק: גיוסים, מינויים, החלפות משרד" },
  { slug: "jobs", he: "משרות ופרויקטים" },
  { slug: "campaigns", he: "קמפיינים וקרדיטים" },
  { slug: "new-orgs", he: "חברות וסטודיואים חדשים במאגר" },
  { slug: "funding", he: "גיוסי הון בקריאייטיב־טק" },
  { slug: "events", he: "אירועים ופסטיבלים" },
  { slug: "people", he: "אנשים חדשים בקהילה מהתחום שלי" },
];
export const TOPIC_SLUGS = TOPICS.map((t) => t.slug);

// Shown next to the newsletter checkbox and stored with the opt-in (anti-spam law: explicit consent).
export const CONSENT_TEXT =
  "אני רוצה לקבל ניוזלטר עם עדכונים מהתעשייה לפי התחומים שבחרתי. אפשר להסיר את ההרשמה בכל רגע.";
