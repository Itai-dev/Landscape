"use client";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/useUser";
import { NAV, JOIN, ME } from "@/lib/chrome.mjs";

// The site header. Same lists and markup as the companies app's header (lib/chrome.mjs), styles in app/chrome.css.
export default function Header() {
  const user = useUser();
  const path = usePathname() || "/";
  const here = (p) => (path === p || path.startsWith(`${p}/`) ? "page" : undefined);
  const cta = user ? ME : JOIN;
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" lang="en" aria-label="Landscape, לדף הבית">Landscape<span>.</span></a>
        <nav className="nav" aria-label="ניווט ראשי">
          {NAV.map((n) => <a key={n.key} href={n.href} aria-current={here(n.href)}>{n.label}</a>)}
        </nav>
        <div className="end">
          <a className="cta" href={cta.href}>{cta.label}</a>
        </div>
      </div>
    </header>
  );
}
