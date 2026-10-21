"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/useUser";
import { NAV, MENU, JOIN, ME, THEME_BUTTON, BURGER, ctaInner, sheetHtml, installTheme, installMenu } from "@/lib/chrome.mjs";

// The site header. Same lists and markup as the companies app's header (lib/chrome.mjs), styles in app/chrome.css.
// Under 861px the links move into the hamburger sheet (installMenu wires the button in both apps).
export default function Header() {
  const user = useUser();
  const path = usePathname() || "/";
  const here = (p) => (path === p || path.startsWith(`${p}/`) ? "page" : undefined);
  const cta = user ? ME : JOIN;
  // React can re-render <html> (e.g. on a 404) and drop the theme set before paint; set it again.
  useEffect(() => { installTheme(); installMenu(); }, [path]);
  const active = MENU.find((n) => here(n.href))?.key || "";
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" lang="en" aria-label="Landscape, לדף הבית">Landscape<span>.</span></a>
        <nav className="nav" aria-label="ניווט ראשי">
          {NAV.map((n) => <a key={n.key} href={n.href} aria-current={here(n.href)}>{n.label}</a>)}
        </nav>
        <div className="end">
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: THEME_BUTTON }} />
          <a className="cta" href={cta.href} dangerouslySetInnerHTML={{ __html: ctaInner(cta) }} />
          <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: BURGER }} />
        </div>
      </div>
      {/* Phone menu; key forces a fresh copy when sign-in changes the call to action. */}
      <div key={cta.href} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: sheetHtml(cta, active) }} />
    </header>
  );
}
