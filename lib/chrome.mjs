// The site's header and footer, one source for both apps: the Next.js pages render them from these lists
// (components/Header.js, app/layout.js), and scripts/prebuild.mjs writes the same markup into the companies
// app (/companies). Styles: app/chrome.css, also copied into the companies app by prebuild.

// Stage 1 is an information channel + newsletter: nobody builds a profile. Profiles, onboarding and "זה אני"
// come back with NEXT_PUBLIC_PROFILES=on (the code stays, behind this flag).
export const PROFILES = process.env.NEXT_PUBLIC_PROFILES === "on";

export const NAV = [
  { key: "people", href: "/people", label: "אנשים" },
  { key: "companies", href: "/companies", label: "חברות" },
  { key: "tenders", href: "/tenders", label: "מכרזים" },
];
export const JOIN = PROFILES ? { href: "/onboard", label: "הצטרפות" } : { href: "/digest#subscribe", label: "לגיליון השבועי", short: "לגיליון" };
export const ME = PROFILES ? { href: "/me", label: "הפרופיל שלי" } : JOIN;
export const FOOTER = [
  { href: "/people", label: "אנשים" },
  { href: "/companies", label: "חברות" },
  { href: "/companies#signals", label: "עדכונים" },
  { href: "/tenders", label: "מכרזים" },
  { href: "/digest", label: "השבוע בתעשייה" },
  ...(PROFILES ? [{ href: "/onboard", label: "הצטרפות" }] : [{ href: "/survey", label: "סקר התעריפים" }]),
  { href: "/privacy", label: "פרטיות" },
];
export const TAGLINE = "תעשיית הקריאייטיב בישראל, במקום אחד";

// Colour theme: light unless the reader picks otherwise (בהירה → כהה → לפי המכשיר), stored in this browser.
// THEME_SCRIPT runs in <head> before paint on both apps; the button is the same markup in both headers.
export const THEME_KEY = "landscape-theme";
// installTheme is also called by the Next header after hydration, for pages where the inline copy didn't run
// (a 404 rendered on the client, for example). It is safe to call more than once.
export function installTheme() {
  var d = document.documentElement, k = "landscape-theme";
  var t = "light";
  try { t = localStorage.getItem(k) || "light"; } catch (e) {}
  if (t !== "dark" && t !== "system") t = "light";
  d.setAttribute("data-theme", t);
  if (window.__landscapeThemeClick) return;
  window.__landscapeThemeClick = true;
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!b) return;
    var c = d.getAttribute("data-theme"), n = c === "dark" ? "system" : c === "system" ? "light" : "dark";
    d.setAttribute("data-theme", n);
    try { localStorage.setItem(k, n); } catch (e) {}
  });
}
export const THEME_SCRIPT = `(${installTheme.toString()})();`;
const ICON = (d) => `<svg class="ti" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const THEME_BUTTON = `<button type="button" class="themebtn" data-theme-toggle title="ערכת צבעים: בהירה, כהה או לפי המכשיר">` +
  `<span class="ti-light">${ICON('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')}<span class="sr-only">ערכת צבעים: בהירה. לחיצה מחליפה לכהה</span></span>` +
  `<span class="ti-dark">${ICON('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>')}<span class="sr-only">ערכת צבעים: כהה. לחיצה מחליפה ללפי המכשיר</span></span>` +
  `<span class="ti-system">${ICON('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>')}<span class="sr-only">ערכת צבעים: לפי המכשיר. לחיצה מחליפה לבהירה</span></span>` +
  `</button>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The call to action keeps a shorter label for narrow phones.
// On the narrowest phones it becomes an envelope icon (the full label stays for screen readers).
const MAIL = ICON('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>');
export const ctaInner = (c) => c.short
  ? `<span class="cta-l">${esc(c.label)}</span><span class="cta-s" aria-hidden="true">${esc(c.short)}</span><span class="cta-i" aria-hidden="true">${MAIL}</span>`
  : esc(c.label);

// Static markup for the companies app. `end` is extra markup before the call to action (the app's language toggle).
export function headerHtml(active = "", end = "") {
  const nav = NAV.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
  return `<header class="top">
  <div class="wrap">
    <a class="brand" href="/" lang="en" aria-label="Landscape, לדף הבית">Landscape<span>.</span></a>
    <nav class="nav sitenav" aria-label="ניווט ראשי">${nav}</nav>
    <div class="end">${end}${THEME_BUTTON}<a class="cta" href="${JOIN.href}" data-cta>${ctaInner(JOIN)}</a></div>
  </div>
</header>`;
}

export function footerHtml() {
  const links = FOOTER.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("");
  return `<footer class="foot">
  <div class="wrap">
    <a class="brand" href="/" lang="en">Landscape<span>.</span></a>
    ${links}
    <span class="foottheme">${THEME_BUTTON}</span>
    <span class="fine">${esc(TAGLINE)}</span>
  </div>
</footer>`;
}
