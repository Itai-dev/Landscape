"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/useUser";
import { installTyping } from "@/lib/typing.mjs";
import { syncTracking } from "@/lib/trackSync";
import { BRAND, WORDMARK, NAV, MENU, JOIN, ME, THEME_BUTTON, BURGER, SITE_SEARCH, AGENT_HOME, ctaInner, sheetHtml, promoHtml, tabbarInner, installTheme, installMenu } from "@/lib/chrome.mjs";

// The site header. Same lists and markup as the companies app's header (lib/chrome.mjs), styles in app/chrome.css.
// Under 861px the links move into the hamburger sheet (installMenu wires the button in both apps).
export default function Header() {
  const user = useUser();
  const path = usePathname() || "/";
  const here = (p) => (path === p || path.startsWith(`${p}/`) ? "page" : undefined);
  const cta = user ? ME : JOIN;
  // React can re-render <html> (e.g. on a 404) and drop the theme set before paint; set it again.
  useEffect(() => { installTheme(); installMenu(); }, [path]);
  // Signed in: keep the tracking list in the account and in this browser in step (once per page load).
  useEffect(() => { if (user) syncTracking().then((r) => r && window.dispatchEvent(new Event("creativein-track"))).catch(() => {}); }, [user?.id]);
  // The header search types example queries (not on the home page, where it's hidden and the hero has its own).
  useEffect(() => installTyping(document.querySelector("header.top form.hsearch input")), [path]);
  const active = MENU.find((n) => here(n.href))?.key || "";
  // Phone tab bar: which item is this page (the call to action counts for /join and the account).
  const tab = AGENT_HOME && path === "/" ? "home" : here("/companies") ? "companies" : here("/people") ? "people" : here("/tenders") ? "tenders" : here("/join") || here("/me") || here("/digest/settings") ? "cta" : "";
  return (
    <>
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: promoHtml() }} />
      {/* Pages with their own search box (/test, /search, /people, /tenders) hide the header one. */}
      <header className={["/test", "/search", "/people", "/tenders", ...(AGENT_HOME ? ["/", "/agent"] : [])].includes(path) ? "top nosearch" : "top"}>
        <div className="wrap">
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: BURGER }} />
          <a className="brand" href="/" lang="en" aria-label={`${BRAND}, לדף הבית`} dangerouslySetInnerHTML={{ __html: WORDMARK }} />
          <nav className="nav" aria-label="ניווט ראשי">
            {NAV.map((n) => <a key={n.key} href={n.href} aria-current={n.key === "signals" ? undefined : n.href === "/" ? (path === "/" ? "page" : undefined) : here(n.href)}>{n.label}</a>)}
          </nav>
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: SITE_SEARCH }} />
          <div className="end">
            <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: THEME_BUTTON }} />
            {user === null && <a className="signin" href="/me">כניסה</a>}
            <a className="cta" href={cta.href} dangerouslySetInnerHTML={{ __html: ctaInner(cta) }} />
          </div>
        </div>
        {/* Phone menu; key forces a fresh copy when sign-in changes the call to action. */}
        <div key={cta.href} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: sheetHtml(cta, active) }} />
      </header>
      <nav key={`bar-${cta.href}-${tab}`} className="sitebar" aria-label="ניווט" dangerouslySetInnerHTML={{ __html: tabbarInner(tab, cta) }} />
    </>
  );
}
