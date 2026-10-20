"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/useUser";
import { NAV, JOIN, ME, THEME_BUTTON, ctaInner, installTheme } from "@/lib/chrome.mjs";

// The site header. Same lists and markup as the companies app's header (lib/chrome.mjs), styles in app/chrome.css.
export default function Header() {
  const user = useUser();
  const path = usePathname() || "/";
  const here = (p) => (path === p || path.startsWith(`${p}/`) ? "page" : undefined);
  const cta = user ? ME : JOIN;
  // React can re-render <html> (e.g. on a 404) and drop the theme set before paint; set it again.
  useEffect(() => { installTheme(); }, [path]);
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
        </div>
      </div>
    </header>
  );
}
