import { Suspense } from "react";
import DigestSettings from "./DigestSettings";

export const metadata = { title: "הגדרות הניוזלטר", robots: { index: false } };

export default function Page() {
  return (
    <div className="wrap narrow">
      <div className="pagehead">
        <h1>הגדרות הניוזלטר</h1>
        <p>התחומים שלכם ותדירות המייל של ״השבוע בתעשייה״.</p>
      </div>
      <Suspense fallback={null}><DigestSettings /></Suspense>
    </div>
  );
}
