import { verifyUnsubscribe } from "@/lib/mailer";

export const metadata = { title: "הסרה מהמייל השבועי", robots: { index: false } };

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
          <p>המייל השבועי לא יישלח יותר לכתובת הזו. אפשר לחזור בכל רגע מעמוד ״השבוע בתעשייה״.</p>
          <a className="btn" href="/digest">ל״השבוע בתעשייה״ באתר</a>
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
        <h1>הסרה מהמייל השבועי</h1>
        {problem ? (
          <>
            <p>{problem}</p>
            <a className="btn" href="/digest/settings">להגדרות המייל השבועי</a>
          </>
        ) : (
          <>
            <p>אחרי האישור, ״השבוע בתעשייה״ לא יישלח יותר לכתובת הזו. החשבון עצמו נשאר, ואפשר למחוק אותו בעמוד <a href="/me">החשבון שלי</a>.</p>
            <form method="post" action="/api/digest/unsubscribe?form=1">
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button className="btn primary">להפסיק לקבל את המייל השבועי</button>
            </form>
            <a className="small tap" href="/digest/settings">אפשר גם רק לשנות תדירות או תחומים</a>
          </>
        )}
      </div>
    </div>
  );
}
