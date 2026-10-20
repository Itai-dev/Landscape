import { verifyUnsubscribe } from "@/lib/mailer";

export const metadata = { title: "הסרה מהגיליון", robots: { index: false } };

// The unsubscribe link in every email opens this page. The confirm button does the change, so a mail
// scanner that opens links can't unsubscribe anyone by accident (one-click clients POST directly).
export default async function Unsubscribe({ searchParams }) {
  const sp = await searchParams;
  const u = String(sp?.u || "");
  const t = String(sp?.t || "");
  if (sp?.done) {
    return (
      <div className="wrap narrow">
        <div className="soon">
          <h1>ההסרה בוצעה</h1>
          <p>לא נשלח יותר את הגיליון לכתובת הזו. אפשר לחזור בכל רגע מעמוד הגיליון.</p>
          <a className="btn" href="/digest">לגיליון באתר</a>
        </div>
      </div>
    );
  }
  const problem =
    sp?.error === "unavailable"
      ? "ההסרה לא זמינה כרגע. אפשר לנסות שוב בעוד כמה דקות."
      : sp?.error || !verifyUnsubscribe(u, t)
        ? "הקישור לא תקין. אפשר להשתמש בקישור שבמייל האחרון, או להתחבר ולשנות את ההגדרות."
        : "";
  return (
    <div className="wrap narrow">
      <div className="soon">
        <h1>הסרה מהגיליון השבועי</h1>
        {problem ? (
          <>
            <p>{problem}</p>
            <a className="btn" href="/digest/settings">להגדרות הגיליון</a>
          </>
        ) : (
          <>
            <p>אחרי האישור לא נשלח יותר את ״השבוע בתעשייה״ לכתובת הזו. הפרופיל, אם יש, נשאר כמו שהוא.</p>
            <form method="post" action="/api/digest/unsubscribe?form=1">
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button className="btn primary">להפסיק לקבל את הגיליון</button>
            </form>
            <a className="small" href="/digest/settings">אפשר גם רק לשנות תדירות או תחומים</a>
          </>
        )}
      </div>
    </div>
  );
}
