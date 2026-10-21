import { notFound } from "next/navigation";
import { seedById, orgLabel } from "@/lib/people";
import { supabaseConfig, PROFILES_ENABLED } from "@/lib/config";
import RemoveForm from "./RemoveForm";

export const metadata = { title: "בקשת הסרה", robots: { index: false } };

export default async function Remove({ searchParams }) {
  const sp = await searchParams;
  const p = seedById(sp?.id);
  if (!p) notFound();
  const signup = PROFILES_ENABLED && Boolean(supabaseConfig());
  return (
    <div className="wrap narrow">
      <div className="pagehead">
        <h1>בקשת הסרה</h1>
        <p>
          הכרטיס של <bdi>{p.name}</bdi> מבוסס על תפקיד שפורסם בפומבי (
          {p.roles.map((r, i) => <span key={i}>{i > 0 ? ", " : ""}<bdi>{orgLabel(r)}</bdi></span>)}).
          אחרי השליחה השם יורד מעמוד האנשים ומדפי החברות בתוך דקה, ונמחק מרשומת החברה במאגר בעדכון הקרוב.
        </p>
      </div>
      <div className="card"><RemoveForm id={p.id} email={process.env.NEXT_PUBLIC_PRIVACY_EMAIL || ""} /></div>
      {signup && (
        <p className="small muted center" style={{ marginBlockStart: 24 }}>
          רוצים פרופיל מלא במקום? <a href={`/onboard?claim=${encodeURIComponent(p.id)}`}>לבניית פרופיל</a>
        </p>
      )}
    </div>
  );
}
