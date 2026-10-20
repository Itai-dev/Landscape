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
          השם <bdi>{p.name}</bdi> מופיע במאגר לפי תפקיד שפורסם ב
          {p.roles.map((r, i) => <span key={i}>{i > 0 ? ", " : ""}<bdi>{orgLabel(r)}</bdi></span>)}.
          אחרי השליחה הכרטיס יורד מהאתר, ואנחנו מסירים את השם גם מרשומת החברה.
        </p>
      </div>
      <div className="card"><RemoveForm id={p.id} /></div>
      <p className="small muted center" style={{ marginBlockStart: 24 }}>
        מעדיפים פרופיל מלא ומעודכן במקום? <a href={`/onboard?claim=${encodeURIComponent(p.id)}`}>זה אני, אני רוצה פרופיל</a>
      </p>
    </div>
  );
}
