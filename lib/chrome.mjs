// The site's header and footer, one source for both apps: the Next.js pages render them from these lists
// (components/Header.js, app/layout.js), and scripts/prebuild.mjs writes the same markup into the companies
// app (/companies). Styles: app/chrome.css, also copied into the companies app by prebuild.

export const NAV = [
  { key: "people", href: "/people", label: "אנשים" },
  { key: "companies", href: "/companies", label: "חברות" },
];
export const JOIN = { href: "/onboard", label: "הצטרפות" };
export const ME = { href: "/me", label: "הפרופיל שלי" };
export const FOOTER = [
  { href: "/people", label: "אנשים" },
  { href: "/companies", label: "חברות" },
  { href: "/companies#signals", label: "עדכונים" },
  { href: "/digest", label: "השבוע בתעשייה" },
  { href: "/onboard", label: "הצטרפות" },
  { href: "/privacy", label: "פרטיות" },
];
export const TAGLINE = "תעשיית הקריאייטיב בישראל, במקום אחד";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Static markup for the companies app. `end` is extra markup before the call to action (the app's language toggle).
export function headerHtml(active = "", end = "") {
  const nav = NAV.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
  return `<header class="top">
  <div class="wrap">
    <a class="brand" href="/" lang="en" aria-label="Landscape, לדף הבית">Landscape<span>.</span></a>
    <nav class="nav sitenav" aria-label="ניווט ראשי">${nav}</nav>
    <div class="end">${end}<a class="cta" href="${JOIN.href}" data-cta>${esc(JOIN.label)}</a></div>
  </div>
</header>`;
}

export function footerHtml() {
  const links = FOOTER.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("");
  return `<footer class="foot">
  <div class="wrap">
    <a class="brand" href="/" lang="en">Landscape<span>.</span></a>
    ${links}
    <span class="fine">${esc(TAGLINE)}</span>
  </div>
</footer>`;
}
