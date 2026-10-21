import { isOpen as surveyOpen, CLOSES_AT } from "./survey/config.js";

// The site's header and footer, one source for both apps: the Next.js pages render them from these lists
// (components/Header.js, app/layout.js), and scripts/prebuild.mjs writes the same markup into the companies
// app (/companies). Styles: app/chrome.css, also copied into the companies app by prebuild.

// Stage 1 is an information channel + newsletter: nobody builds a profile. Profiles, onboarding and "זה אני"
// come back with NEXT_PUBLIC_PROFILES=on (the code stays, behind this flag).
export const PROFILES = process.env.NEXT_PUBLIC_PROFILES === "on";
// "כלים ו־AI" (/tools, the digest section, the home strip, the search group): off until NEXT_PUBLIC_TOOLS=on.
export const TOOLS = process.env.NEXT_PUBLIC_TOOLS === "on";
const TOOLS_LINK = TOOLS ? [{ key: "tools", href: "/tools", label: "כלים" }] : [];

// The public brand. "Landscape" stays the internal project name (repo, ids, storage keys).
export const BRAND = "creativein";
// The wordmark: the name and a purple dot (styles in app/chrome.css).
export const WORDMARK = `${BRAND}<span>.</span>`;

export const NAV = [
  { key: "people", href: "/people", label: "אנשים" },
  { key: "companies", href: "/companies", label: "חברות" },
  { key: "tenders", href: "/tenders", label: "מכרזים" },
  ...TOOLS_LINK,
];
export const JOIN = PROFILES ? { href: "/onboard", label: "הצטרפות" } : { href: "/join", label: "המייל השבועי", short: "הרשמה" };
// Signed in, the call to action leads to the account (digest settings, alerts, survey).
export const ME = PROFILES ? { href: "/me", label: "הפרופיל שלי" } : { href: "/me", label: "החשבון שלי", short: "החשבון" };
export const FOOTER = [
  { href: "/people", label: "אנשים" },
  { href: "/companies", label: "חברות" },
  { href: "/companies#signals", label: "עדכונים" },
  { href: "/tenders", label: "מכרזים" },
  ...TOOLS_LINK,
  { href: "/digest", label: "השבוע בתעשייה" },
  ...(PROFILES ? [{ href: "/onboard", label: "הצטרפות" }] : [{ href: "/survey", label: "סקר התעריפים" }]),
  { href: "/privacy", label: "פרטיות" },
];
export const TAGLINE = "תעשיית הקריאייטיב בישראל. האנשים, החברות וההזדמנויות.";
// A discreet way to tell us what is missing (footer of both apps, and the /join sent screen).
export const FEEDBACK = { href: "/feedback", label: "משהו חסר? יש רעיון לשיפור?" };
// The phone tab bar (both apps, under 861px): the main sections, then the call to action (the digest,
// or the account when signed in). `tab` names the companies app's own section, so the app can switch in place.
export const TABS = [
  { key: "home", href: "/", label: "בית" },
  { key: "companies", href: "/companies", label: "חברות", tab: "explore" },
  { key: "signals", href: "/companies#signals", label: "עדכונים", tab: "signals" },
  { key: "tenders", href: "/tenders", label: "מכרזים" },
];
// The phone menu (hamburger): what the tab bar doesn't hold.
export const MENU = [
  { key: "people", href: "/people", label: "אנשים" },
  ...TOOLS_LINK,
  { key: "digest", href: "/digest", label: "השבוע בתעשייה" },
  ...(PROFILES ? [] : [{ key: "survey", href: "/survey", label: "סקר התעריפים" }]),
  { key: "privacy", href: "/privacy", label: "פרטיות" },
];

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
// Phone menu: one button ([data-menu-toggle]) opens the sheet (#sitemenu) under the header.
// Esc, a tap on a link, or widening past the phone layout closes it; focus goes back to the button.
export function installMenu() {
  // The search example: the short one is the default (it fits on phones); wider screens get the full question.
  if (window.matchMedia("(min-width: 481px)").matches) {
    document.querySelectorAll("input[data-ph-long]").forEach(function (i) { i.placeholder = i.getAttribute("data-ph-long"); });
  }
  if (window.__landscapeMenu) return;
  window.__landscapeMenu = true;
  var d = document.documentElement;
  function parts() { return { b: document.querySelector("[data-menu-toggle]"), m: document.getElementById("sitemenu") }; }
  function set(open, focusBack) {
    var p = parts(); if (!p.b || !p.m) return;
    if (open) { var h = p.b.closest("header"); if (h) p.m.style.top = Math.max(0, h.getBoundingClientRect().bottom) + "px"; }
    p.m.hidden = !open;
    p.b.setAttribute("aria-expanded", open ? "true" : "false");
    d.classList.toggle("menu-open", open);
    if (open) { var f = p.m.querySelector("a"); if (f) f.focus(); }
    else if (focusBack) p.b.focus();
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest("[data-menu-toggle]")) { var p = parts(); set(p.m && p.m.hidden, true); return; }
    if (d.classList.contains("menu-open") && t.closest("#sitemenu a")) set(false, false);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && d.classList.contains("menu-open")) set(false, true); });
  var wide = window.matchMedia("(min-width: 861px)"), onWide = function (q) { if (q.matches) set(false, false); };
  if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
}
export const THEME_SCRIPT = `(${installTheme.toString()})();(${installMenu.toString()})();`;
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
const PERSON = ICON('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>');
export const BURGER = `<button type="button" class="burger" data-menu-toggle aria-expanded="false" aria-controls="sitemenu">` +
  `<span class="bars" aria-hidden="true"></span><span class="sr-only">תפריט</span></button>`;
// The sheet the hamburger opens (phones and small tablets). Same markup in both apps.
export function sheetHtml(cta, active = "") {
  const links = MENU.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
  return `<div class="menusheet" id="sitemenu" hidden><div class="wrap">` +
    `<nav class="menusheet-nav" aria-label="תפריט">${links}</nav>` +
    `<div class="menusheet-end"><a class="btn-ink" href="${cta.href}" data-cta-sheet>${esc(cta.label)}</a>${THEME_BUTTON}</div>` +
    `</div></div>`;
}

export const ctaInner = (c) => c.short
  ? `<span class="cta-l">${esc(c.label)}</span><span class="cta-s" aria-hidden="true">${esc(c.short)}</span><span class="cta-i" aria-hidden="true">${c.href === "/me" ? PERSON : MAIL}</span>`
  : esc(c.label);

// The strip above the header (like Awwwards' promo line): the digest, and the survey while it's open.
// It scrolls away with the page; the header under it stays. The text runs as a ticker (a copy is hidden from screen readers).
const SEARCH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
export function promoHtml(now = Date.now()) {
  const items = [`<a href="/join"><b>השבוע בתעשייה</b> כל יום ראשון במייל, חינם</a>`];
  if (surveyOpen(now)) items.push(`<a href="/survey" data-promo-survey="${CLOSES_AT}"><b>סקר התעריפים 2026</b> 4 דקות, ורואים את התוצאות</a>`);
  const run = items.join("");
  return `<div class="promo"><div class="track"><div class="run">${run}</div><div class="run" aria-hidden="true">${run.replaceAll("<a ", '<a tabindex="-1" ')}</div></div></div>`;
}
// The search field in the header: the whole site on the Next pages (goes to /search).
export const SITE_SEARCH = `<form class="hsearch" role="search" action="/search">${SEARCH_ICON}<input type="search" name="q" placeholder="למשל: מושן בתל אביב" data-ph-long="למשל: מי מזמין מושן בתל אביב" aria-label="חיפוש חברות, אנשים ותחומים" autocomplete="off"></form>`;
// In the companies app the header field filters the list in place (the app wires #q).
export const COMPANY_SEARCH = `<label class="hsearch" for="q">${SEARCH_ICON}<input id="q" type="search" data-i18n-ph="search.ph" placeholder="חיפוש בחברות" autocomplete="off" aria-label="חיפוש חברות לפי שם, תחום או עיר"></label>`;

// Static markup for the companies app. `end` is extra markup before the call to action (the app's language toggle).
// Order: hamburger (phones only), wordmark, links (desktop), search, then the end group.
export function headerHtml(active = "", end = "", search = COMPANY_SEARCH) {
  const nav = NAV.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`).join("");
  return `${promoHtml()}
<header class="top">
  <div class="wrap">
    ${BURGER}
    <a class="brand" href="/" lang="en" aria-label="${BRAND}, לדף הבית">${WORDMARK}</a>
    <nav class="nav sitenav" aria-label="ניווט ראשי">${nav}</nav>
    ${search}
    <div class="end">${end}${THEME_BUTTON}<a class="cta" href="${JOIN.href}" data-cta>${ctaInner(JOIN)}</a></div>
  </div>
  ${sheetHtml(JOIN, active)}
</header>`;
}

// Phone tab bar icons (lucide-style strokes, same weight as the rest of the chrome).
const TAB_ICON = {
  home: ICON('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
  companies: ICON('<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'),
  signals: ICON('<path d="M3 12h4l3-7 4 14 3-7h4"/>'),
  tenders: ICON('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
};
// The bar's last item is the call to action: the digest sign-up, or the account when signed in.
export function tabbarInner(active = "", cta = JOIN) {
  const tabs = TABS.map((t) => `<a href="${t.href}" data-sitetab="${t.key}"${t.tab ? ` data-apptab="${t.tab}"` : ""}${t.key === active ? ' aria-current="page"' : ""}>${TAB_ICON[t.key]}<span>${esc(t.label)}</span></a>`).join("");
  const mine = active === "cta" ? ' aria-current="page"' : "";
  return `${tabs}<a href="${cta.href}" class="tcta" data-cta-bar${mine}>${tabCtaInner(cta)}</a>`;
}
export const tabCtaInner = (cta) => `${cta.href === "/me" ? PERSON : MAIL}<span>${esc(cta.short || cta.label)}</span>`;
export function tabbarHtml(active = "", cta = JOIN) {
  return `<nav class="sitebar" aria-label="ניווט">${tabbarInner(active, cta)}</nav>`;
}

export function footerHtml() {
  const links = FOOTER.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join("");
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-top"><a class="brand" href="/" lang="en">${WORDMARK}</a><p class="fine">${esc(TAGLINE)}</p></div>
    <nav class="foot-links" aria-label="קישורים">${links}</nav>
    <div class="foot-bottom"><span>מידע עסקי ציבורי, עם מקור לכל פרט · <a class="foot-feedback" href="${FEEDBACK.href}" data-track="feedback_open">${esc(FEEDBACK.label)}</a></span><span class="foottheme">${THEME_BUTTON}</span></div>
  </div>
</footer>`;
}
