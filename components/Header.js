"use client";
import { useUser } from "@/components/useUser";
import { SearchIcon } from "@/components/Icons";

export default function Header() {
  const user = useUser();
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Landscape — דף הבית">
          Landscape<span>.</span>
        </a>
        <form className="psearch hsearch" role="search" action="/people">
          <input type="search" name="q" placeholder="חיפוש אנשים בתעשייה…" aria-label="חיפוש אנשים" />
          <button className="go" aria-label="חיפוש"><SearchIcon /></button>
        </form>
        <nav className="nav" aria-label="ניווט ראשי">
          <a href="/map/app.html">המפה</a>
          <a href="/people">אנשים</a>
        </nav>
        <div className="end">
          {user ? <a className="cta" href="/me">הפרופיל שלי</a> : <a className="cta" href="/#join">הצטרפות</a>}
        </div>
      </div>
    </header>
  );
}
