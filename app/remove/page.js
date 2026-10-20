import { notFound } from "next/navigation";
import { seedById, orgLabel } from "@/lib/people";
import RemoveForm from "./RemoveForm";

export const metadata = { title: "בקשת הסרה", robots: { index: false } };

export default async function Remove({ searchParams }) {
  const sp = await searchParams;
  const p = seedById(sp?.id);
  if (!p) notFound();
  return (
    <div className="wrap narrow">
      <div className="pagehead">
        <h1>בקשת הסרה</h1>
        <p>
          הכרטיס של <bdi>{p.name}</bdi> מבוסס על תפקיד שפורסם בפומבי (
          {p.roles.map((r, i) => <span key={i}>{i > 0 ? ", " : ""}<bdi>{orgLabel(r)}</bdi></span>)}).
          אחרי השליחה הוא יורד מהאתר מיד, והשם יימחק גם מרשומת החברה.
        </p>
      </div>
      <div className="card"><RemoveForm id={p.id} email={process.env.NEXT_PUBLIC_PRIVACY_EMAIL || ""} /></div>
      <p className="small muted center" style={{ marginBlockStart: 24 }}>
        רוצים פרופיל מלא במקום? <a href={`/onboard?claim=${encodeURIComponent(p.id)}`}>לבניית פרופיל</a>
      </p>
    </div>
  );
}
