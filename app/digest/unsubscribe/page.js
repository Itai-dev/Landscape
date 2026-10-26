import { verifyUnsubscribe } from "@/lib/mailer";

export const metadata = { title: "הסרה מהניוזלטר", robots: { index: false } };

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
          <h1>הסרנו אתכם מהרשימה</h1>
          <p>הניוזלטר לא יישלח יותר לכתובת הזו. אפשר לחזור בכל רגע מעמוד ״השבוע בתעשייה״.</p>
          <a className="btn" href="/digest">ל״השבוע בתעשייה״ באתר</a>
        </div>
      </div>
    );
  }
  const problem =
    sp?.error === "unavailable"
      ? "ההסרה לא זמינה כרגע. נסו שוב בעוד כמה דקות."
      : sp?.error || !verifyUnsubscribe(u, t)
        ? "הקישור הזה לא עובד. השתמשו בקישור שבמייל האחרון, או היכנסו לחשבון ושנו את ההגדרות."
        : "";
  return (
    <div className="wrap narrow">
      <div className="soon">
        <h1>הסרה מהניוזלטר</h1>
        {problem ? (
          <>
            <p>{problem}</p>
            <a className="btn" href="/digest/settings">להגדרות הניוזלטר</a>
          </>
        ) : (
          <>
            <p>אחרי האישור, ״השבוע בתעשייה״ לא יישלח יותר לכתובת הזו. החשבון עצמו נשאר, ואפשר למחוק אותו ב<a href="/me">אזור האישי</a>.</p>
            <form method="post" action="/api/digest/unsubscribe?form=1">
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button className="btn primary">הסרה מהמייל השבועי</button>
            </form>
            <a className="small tap" href="/digest/settings">אפשר גם רק לשנות תדירות או תחומים</a>
          </>
        )}
      </div>
    </div>
  );
}
