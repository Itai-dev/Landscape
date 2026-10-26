import { verifyListToken } from "@/lib/mailer";

export const metadata = { title: "הפסקת התראות", robots: { index: false } };

// The "stop alerts" link in every alert email opens this page. The button does the change, so a mail
// scanner that opens links can't switch anyone off by accident (one-click clients POST directly).
export default async function AlertsUnsubscribe({ searchParams }) {
  const sp = await searchParams;
  const u = String(sp?.u || "");
  const t = String(sp?.t || "");
  if (sp?.done) {
    return (
      <div className="wrap narrow">
        <div className="soon">
          <h1>ההתראות הופסקו</h1>
          <p>לא יישלחו יותר התראות על חברות לכתובת הזו. הניוזלטר, אם נרשמתם אליו, ממשיך כרגיל.</p>
          <a className="btn" href="/me#follows">לחשבון שלי</a>
        </div>
      </div>
    );
  }
  const problem =
    sp?.error === "unavailable"
      ? "הפעולה לא זמינה כרגע. נסו שוב בעוד כמה דקות."
      : sp?.error || !verifyListToken("alerts", u, t)
        ? "הקישור הזה לא עובד. השתמשו בקישור שבמייל האחרון, או היכנסו לחשבון ושנו את ההגדרות."
        : "";
  return (
    <div className="wrap narrow">
      <div className="soon">
        <h1>הפסקת התראות</h1>
        {problem ? (
          <>
            <p>{problem}</p>
            <a className="btn" href="/me#follows">לחשבון שלי</a>
          </>
        ) : (
          <>
            <p>אחרי האישור לא יישלחו יותר התראות על החברות שבחרתם. רשימת החברות נשמרת, והניוזלטר לא מושפע.</p>
            <form method="post" action="/api/alerts/unsubscribe?form=1">
              <input type="hidden" name="u" value={u} />
              <input type="hidden" name="t" value={t} />
              <button className="btn primary">הפסקת ההתראות</button>
            </form>
            <a className="small tap" href="/me#follows">אפשר גם לעבור לסיכום שבועי</a>
          </>
        )}
      </div>
    </div>
  );
}
