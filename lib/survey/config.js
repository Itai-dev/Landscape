// Rates and payment-terms survey 2026: questions, answer bands and per-craft deliverables.
// One source for the questionnaire (app/survey/start), validation (lib/survey/validate.js)
// and aggregation (lib/survey/aggregate.js). Hebrew copy is gender-neutral (plural / infinitive).

export const SURVEY_ID = "rates-2026";
export const CLOSES_AT = "2026-12-31T23:59:59+02:00";
export const CLOSES_LABEL = "31 בדצמבר 2026";
export const RESULTS_LABEL = "ינואר 2027";
export const K_MIN = 5; // no number is shown for a group smaller than this
export const TEASER_MIN = 30; // public headline numbers appear from this many responses
export const UNLOCK_REFERRALS = 3; // invite this many respondents to see the full results without answering

export const isOpen = (now = Date.now()) => now <= Date.parse(CLOSES_AT);

// Crafts asked about (slugs from schema/taxonomy.json where one exists).
export const SURVEY_CRAFTS = [
  { slug: "motion-design", he: "מושן" },
  { slug: "animation-2d", he: "אנימציה דו־ממדית" },
  { slug: "animation-3d", he: "אנימציית תלת־ממד" },
  { slug: "vfx", he: "אפקטים (VFX)" },
  { slug: "cgi-3d", he: "תלת־ממד ו־CGI" },
  { slug: "editing", he: "עריכה" },
  { slug: "color-grading", he: "צביעה (קולור)" },
  { slug: "post-production", he: "פוסט" },
  { slug: "sound-design", he: "עיצוב סאונד" },
  { slug: "music-production", he: "מוזיקה" },
  { slug: "branding", he: "מיתוג" },
  { slug: "graphic-design", he: "עיצוב גרפי" },
  { slug: "illustration", he: "איור" },
  { slug: "digital-design", he: "עיצוב דיגיטלי ו־UX" },
  { slug: "production", he: "הפקה" },
  { slug: "ai-creative", he: "יצירה עם AI" },
];
export const CRAFT_SLUGS = SURVEY_CRAFTS.map((c) => c.slug);
export const surveyCraftLabel = (slug) => SURVEY_CRAFTS.find((c) => c.slug === slug)?.he || slug;

export const MODES = [
  { slug: "freelancer", he: "פרילנס", group: "independent" },
  { slug: "studio_owner", he: "בעלות על סטודיו", group: "independent" },
  { slug: "studio_employee", he: "שכירות בסטודיו", group: "employed" },
  { slug: "inhouse", he: "שכירות אין־האוס (בחברה או במותג)", group: "employed" },
  { slug: "agency", he: "שכירות במשרד פרסום", group: "employed" },
];
export const MODE_SLUGS = MODES.map((m) => m.slug);
export const modeLabel = (slug) => MODES.find((m) => m.slug === slug)?.he || slug;
export const modeGroup = (slug) => MODES.find((m) => m.slug === slug)?.group || null;
export const isIndependent = (mode) => modeGroup(mode) === "independent";

export const EXPERIENCE = [
  { slug: "0-2", he: "עד שנתיים" },
  { slug: "3-5", he: "3 עד 5 שנים" },
  { slug: "6-10", he: "6 עד 10 שנים" },
  { slug: "11-15", he: "11 עד 15 שנים" },
  { slug: "16+", he: "16 שנים ומעלה" },
];

export const REGIONS = [
  { slug: "tel-aviv", he: "תל אביב והמרכז" },
  { slug: "sharon", he: "השרון" },
  { slug: "jerusalem", he: "ירושלים והסביבה" },
  { slug: "haifa-north", he: "חיפה והצפון" },
  { slug: "shfela", he: "השפלה" },
  { slug: "south", he: "הדרום" },
  { slug: "abroad", he: "מחוץ לישראל" },
];

// Money bands in ₪. `lo`/`hi` bound the band; an open top band has hi = null.
// Ranges ("₪100–150") render left to right inside Hebrew text; `ltr` marks them for the UI.
const band = (slug, lo, hi, he) => ({ slug, lo, hi, he, ltr: lo > 0 && hi != null });
export const HOURLY = [
  band("h0", 0, 100, "עד ₪100"),
  band("h1", 100, 150, "₪100–150"),
  band("h2", 150, 200, "₪150–200"),
  band("h3", 200, 250, "₪200–250"),
  band("h4", 250, 350, "₪250–350"),
  band("h5", 350, 500, "₪350–500"),
  band("h6", 500, null, "מעל ₪500"),
];
export const DAILY = [
  band("d0", 0, 800, "עד ₪800"),
  band("d1", 800, 1200, "₪800–1,200"),
  band("d2", 1200, 1600, "₪1,200–1,600"),
  band("d3", 1600, 2000, "₪1,600–2,000"),
  band("d4", 2000, 2500, "₪2,000–2,500"),
  band("d5", 2500, 3500, "₪2,500–3,500"),
  band("d6", 3500, null, "מעל ₪3,500"),
];
export const SALARY = [
  band("s0", 0, 8000, "עד ₪8,000"),
  band("s1", 8000, 11000, "₪8,000–11,000"),
  band("s2", 11000, 14000, "₪11,000–14,000"),
  band("s3", 14000, 18000, "₪14,000–18,000"),
  band("s4", 18000, 23000, "₪18,000–23,000"),
  band("s5", 23000, 30000, "₪23,000–30,000"),
  band("s6", 30000, null, "מעל ₪30,000"),
];
export const PRICE = [
  band("p0", 0, 2000, "עד ₪2,000"),
  band("p1", 2000, 5000, "₪2,000–5,000"),
  band("p2", 5000, 10000, "₪5,000–10,000"),
  band("p3", 10000, 20000, "₪10,000–20,000"),
  band("p4", 20000, 40000, "₪20,000–40,000"),
  band("p5", 40000, 80000, "₪40,000–80,000"),
  band("p6", 80000, null, "מעל ₪80,000"),
];
export const BANDS = { hourly: HOURLY, daily: DAILY, salary: SALARY, price: PRICE };
// Sanity limits for an exact number someone types (anything outside is ignored, not stored).
export const EXACT_LIMITS = { hourly: [30, 3000], daily: [200, 20000], salary: [3000, 150000], price: [200, 2000000] };

// Two or three typical deliverables per craft, priced as a whole job (before VAT).
export const DELIVERABLES = {
  "motion-design": [
    { slug: "explainer-30", he: "סרטון מושן מוסבר של 30 שניות" },
    { slug: "logo-anim", he: "אנימציית לוגו (5–10 שניות)" },
    { slug: "social-pack", he: "חבילת 5 סרטוני סושיאל קצרים" },
  ],
  "animation-2d": [
    { slug: "anim2d-30", he: "אנימציה דו־ממדית של 30 שניות" },
    { slug: "anim2d-char", he: "עיצוב דמות והנפשה בסיסית" },
  ],
  "animation-3d": [
    { slug: "anim3d-30", he: "אנימציית תלת־ממד של 30 שניות" },
    { slug: "packshot", he: "פאקשוט מונפש של מוצר" },
  ],
  vfx: [
    { slug: "vfx-shot", he: "שוט VFX בודד בפרסומת" },
    { slug: "vfx-30", he: "חבילת VFX לפרסומת של 30 שניות" },
  ],
  "cgi-3d": [
    { slug: "still-render", he: "הדמיה סטילס של מוצר" },
    { slug: "arch-viz", he: "הדמיה אדריכלית (תמונה אחת)" },
  ],
  editing: [
    { slug: "edit-30", he: "עריכת פרסומת של 30 שניות" },
    { slug: "edit-day", he: "יום עריכה באולפן" },
    { slug: "edit-social", he: "עריכת 5 סרטוני סושיאל" },
  ],
  "color-grading": [
    { slug: "color-30", he: "צביעה לפרסומת של 30 שניות" },
    { slug: "color-day", he: "יום צביעה" },
  ],
  "post-production": [
    { slug: "post-30", he: "פוסט מלא לפרסומת של 30 שניות" },
    { slug: "online-30", he: "אונליין וגרפיקה לפרסומת של 30 שניות" },
  ],
  "sound-design": [
    { slug: "mix-30", he: "עיצוב סאונד ומיקס לפרסומת של 30 שניות" },
    { slug: "sound-logo", he: "לוגו סאונד" },
  ],
  "music-production": [
    { slug: "music-30", he: "מוזיקה מקורית לפרסומת של 30 שניות" },
    { slug: "jingle", he: "ג׳ינגל" },
  ],
  branding: [
    { slug: "identity", he: "לוגו ושפה מיתוגית בסיסית" },
    { slug: "identity-full", he: "מיתוג מלא עם ספר מותג" },
  ],
  "graphic-design": [
    { slug: "campaign-kv", he: "קי־ויז׳ואל לקמפיין" },
    { slug: "brochure", he: "עיצוב חוברת או קטלוג (8 עמודים)" },
  ],
  illustration: [
    { slug: "illu-single", he: "איור בודד לשימוש מסחרי" },
    { slug: "illu-set", he: "סט של 5 איורים" },
  ],
  "digital-design": [
    { slug: "landing", he: "עיצוב דף נחיתה" },
    { slug: "app-screens", he: "עיצוב 10 מסכי אפליקציה" },
  ],
  production: [
    { slug: "prod-day", he: "יום צילום של פרסומת קטנה (הפקה מלאה)" },
    { slug: "prod-social", he: "הפקת יום צילום לסושיאל" },
  ],
  "ai-creative": [
    { slug: "ai-30", he: "סרטון של 30 שניות שנוצר עם AI" },
    { slug: "ai-stills", he: "סט של 10 תמונות שנוצרו עם AI" },
  ],
};
export const deliverableLabel = (craft, slug) => DELIVERABLES[craft]?.find((d) => d.slug === slug)?.he || slug;

export const PAYMENT_TERMS = [
  { slug: "immediate", he: "מיידי או מזומן" },
  { slug: "net30", he: "שוטף + 30" },
  { slug: "net45", he: "שוטף + 45" },
  { slug: "net60", he: "שוטף + 60" },
  { slug: "net90", he: "שוטף + 90" },
  { slug: "longer", he: "יותר מזה" },
];
export const LATE_SHARE = [
  { slug: "none", he: "אף פעם" },
  { slug: "lt25", he: "פחות מרבע מהחשבוניות" },
  { slug: "25-50", he: "רבע עד חצי" },
  { slug: "50-75", he: "חצי עד שלושה רבעים" },
  { slug: "gt75", he: "רוב החשבוניות" },
];
export const DELAY = [
  { slug: "none", he: "אין איחורים" },
  { slug: "lt2w", he: "עד שבועיים" },
  { slug: "2-4w", he: "שבועיים עד חודש" },
  { slug: "1-2m", he: "חודש עד חודשיים" },
  { slug: "gt2m", he: "יותר מחודשיים" },
];
export const CLIENT_TYPES = [
  { slug: "agencies", he: "משרדי פרסום" },
  { slug: "brands", he: "מותגים ישירות" },
  { slug: "production", he: "חברות הפקות" },
  { slug: "tech", he: "סטארטאפים והייטק" },
  { slug: "public", he: "גופים ציבוריים ועמותות" },
  { slug: "abroad", he: "לקוחות בחו״ל" },
];
export const CHANNELS = [
  { slug: "network", he: "היכרויות והמלצות" },
  { slug: "linkedin", he: "לינקדאין" },
  { slug: "instagram", he: "אינסטגרם" },
  { slug: "behance", he: "Behance או Dribbble" },
  { slug: "website", he: "אתר אישי" },
  { slug: "xplace", he: "XPlace" },
  { slug: "marketplaces", he: "Fiverr או Upwork" },
  { slug: "agencies", he: "פניות ממשרדים וסטודיואים" },
  { slug: "jobboards", he: "לוחות דרושים" },
  { slug: "other", he: "אחר" },
];
export const MAX_CHANNELS = 3;
export const AI_SCALE = [
  { slug: "-2", he: "ירד מאוד" },
  { slug: "-1", he: "ירד" },
  { slug: "0", he: "לא השתנה" },
  { slug: "1", he: "עלה" },
  { slug: "2", he: "עלה מאוד" },
];
export const PAIN_MAX = 300;

export const label = (list, slug) => list.find((x) => x.slug === slug)?.he || slug;
