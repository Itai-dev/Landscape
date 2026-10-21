// Company types: one source for labels, icons and colours, used by the Next pages and the companies app.
// scripts/prebuild.mjs writes KIND_ICONS and KIND_HE into site/app.html (between the kinds:js markers);
// the colours are CSS tokens in app/chrome.css (--kind-<kind>-bg / -bg2 / -ink), which both apps load.
// A tag is two joined segments: a small square with the icon, then the label (never icon-only).

const svg = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const KINDS = [
  { kind: "client", label_he: "מותג", plural_he: "מותגים", line_he: "מי מזמין עבודות קריאייטיב",
    icon: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>') },
  { kind: "agency", label_he: "משרד פרסום", plural_he: "משרדי פרסום", line_he: "ודרך מי הם עובדים",
    icon: svg('<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/>') },
  { kind: "studio", label_he: "סטודיו", plural_he: "סטודיואים", line_he: "לפי תחום ועיר",
    icon: svg('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>') },
  { kind: "production_company", label_he: "חברת הפקה", plural_he: "חברות הפקה", line_he: "פרסומות, קולנוע, טלוויזיה ואירועים",
    icon: svg('<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M2 11h20"/><path d="m6 7 3 4"/><path d="m11 7 3 4"/><path d="m16 7 3 4"/>') },
  { kind: "startup", label_he: "סטארטאפ", plural_he: "סטארטאפים", line_he: "כלים ומוצרים לעולם הקריאייטיב",
    icon: svg('<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>') },
  { kind: "community", label_he: "קהילה", plural_he: "קהילות", line_he: "מפגשים, קבוצות וארגונים מקצועיים",
    icon: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>') },
];

export const KIND = Object.fromEntries(KINDS.map((k) => [k.kind, k]));
export const KIND_ICONS = Object.fromEntries(KINDS.map((k) => [k.kind, k.icon]));
export const KIND_HE = Object.fromEntries(KINDS.map((k) => [k.kind, { one: k.label_he, many: k.plural_he }]));
export const kindLabelHe = (kind, many = false) => (KIND[kind] ? (many ? KIND[kind].plural_he : KIND[kind].label_he) : "");

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** The tag as HTML (for strings); the React version is components/KindTag.js. */
export function kindTagHtml(kind, { many = false, label } = {}) {
  const k = KIND[kind];
  if (!k) return "";
  return `<span class="ktag k-${kind}"><span class="ki">${k.icon}</span><span class="kl">${esc(label ?? (many ? k.plural_he : k.label_he))}</span></span>`;
}
