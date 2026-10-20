"use client";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/useUser";

// Same top bar as the companies app (site/app.html): logo, People, Companies, and one call to action.
export default function Header() {
  const user = useUser();
  const path = usePathname() || "/";
  const here = (p) => (path === p || path.startsWith(`${p}/`) ? "page" : undefined);
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Landscape, לדף הבית">Landscape<span>.</span></a>
        <nav className="nav" aria-label="ניווט ראשי">
          <a href="/people" aria-current={here("/people")}>אנשים</a>
          <a href="/companies">חברות</a>
        </nav>
        <div className="end">
          {user ? <a className="cta" href="/me">הפרופיל שלי</a> : <a className="cta" href="/onboard">הצטרפות</a>}
        </div>
      </div>
    </header>
  );
}
