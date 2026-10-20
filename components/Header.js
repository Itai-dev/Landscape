"use client";
import { useUser } from "@/components/useUser";

export default function Header() {
  const user = useUser();
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="/" aria-label="Landscape — דף הבית">
          Landscape<span>.</span>
        </a>
        <nav className="nav" aria-label="ניווט ראשי">
          <a href="/map/app.html">המפה</a>
          <a href="/people">אנשים</a>
          {user ? <a href="/me">הפרופיל שלי</a> : <a className="cta" href="/#join">הצטרפות</a>}
        </nav>
      </div>
    </header>
  );
}
