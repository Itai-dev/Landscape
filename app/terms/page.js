import { notFound } from "next/navigation";
import { PREMIUM, PLANS, FREE_FOLLOWS, shekels } from "@/lib/premium";
import { sender } from "@/lib/mailer";

export const metadata = { title: "תנאי השימוש", alternates: { canonical: "/terms" } };

// The terms for using the site and for premium (paid, renews automatically, cancelled online).
// Shown only while premium is switched on; the free site is covered by the privacy policy.
export default function Terms() {
  if (!PREMIUM) notFound();
  const { name, address, contact } = sender();
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>תנאי השימוש</h1>
        <p>מה מקבלים ב־CreativeIn, כמה עולה פרימיום ואיך מבטלים. עודכן לאחרונה: אוקטובר 2026.</p>
      </div>

      <div className="card stack">
        <h2>השירות</h2>
        <p>CreativeIn מרכז מידע עסקי פומבי על תעשיית הקריאייטיב בישראל: חברות, אנשי מפתח בתפקידם המקצועי, עדכונים, מכרזים ומשרות. לכל פרט מוצג המקור שלו. אנחנו בודקים את המידע מול המקורות, אבל הוא לא תחליף לבדיקה שלכם לפני החלטה עסקית, ואנחנו לא אחראים לנזק שנגרם מהסתמכות עליו.</p>
        <p>השימוש באתר, במייל השבועי ובמעקב אחרי עד {FREE_FOLLOWS} חברות הוא בחינם.</p>
      </div>

      <div className="card stack" id="premium">
        <h2>פרימיום</h2>
        <ul>
          <li><b>מה כלול:</b> מעקב אחרי כמה חברות שרוצים, התראות בתוך שעה מהפרסום, ייצוא רשימות ל־CSV וחיפוש עם AI.</li>
          <li><b>מחיר:</b> {shekels(PLANS.monthly.price)} לחודש או {shekels(PLANS.yearly.price)} לשנה, כולל מע״מ.</li>
          <li><b>חידוש:</b> המנוי מתחדש אוטומטית בסוף כל חודש או שנה, באותו מחיר, עד שמבטלים. על כל שינוי מחיר נודיע במייל 30 יום מראש, ואפשר לבטל לפני שהוא חל.</li>
          <li><b>תשלום:</b> בכרטיס אשראי, דרך חברת סליקה ישראלית. פרטי הכרטיס נשמרים אצלה ולא אצלנו. אחרי כל תשלום נשלחת חשבונית מס קבלה במייל.</li>
        </ul>
      </div>

      <div className="card stack" id="cancel">
        <h2>ביטול</h2>
        <ul>
          <li>אפשר לבטל בכל רגע באזור האישי, בכפתור ״ביטול המנוי״, בלי דמי ביטול. אפשר גם לכתוב לנו{contact ? <> ל־<a className="ltr" href={`mailto:${contact}`}>{contact}</a></> : null}, ונבטל תוך 3 ימי עסקים.</li>
          <li>אחרי הביטול לא נחייב יותר, והפרימיום ממשיך לעבוד עד סוף התקופה ששולמה.</li>
          <li>ביטול בתוך 14 ימים מההצטרפות לפרימיום מזכה בהחזר מלא של התשלום הראשון. כתבו לנו ונחזיר אותו לכרטיס.</li>
          <li>אחרי סוף התקופה החשבון חוזר לחינם: החברות שכבר במעקב נשארות, וההתראות עליהן ממשיכות פעם ביום.</li>
        </ul>
      </div>

      <div className="card stack">
        <h2>החשבון שלכם</h2>
        <p>החשבון אישי. אפשר למחוק אותו בכל רגע באזור האישי, ואז נמחקים גם המעקב, ההעדפות והמנוי (מנוי פעיל מבוטל קודם). מה נשמר ואיך משתמשים בו, ב<a href="/privacy">מדיניות הפרטיות</a>.</p>
      </div>

      {(name || address || contact) && (
        <div className="card stack">
          <h2>מי אנחנו</h2>
          <p>{[name, address].filter(Boolean).join(", ")}{contact ? <>. פניות: <a className="ltr" href={`mailto:${contact}`}>{contact}</a></> : null}</p>
        </div>
      )}
    </div>
  );
}
