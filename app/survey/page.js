import SurveyCta from "@/components/SurveyCta";
import RefCapture from "@/components/RefCapture";
import { SparkIcon } from "@/components/Icons";
import { CLOSES_LABEL, RESULTS_LABEL, K_MIN, isOpen } from "@/lib/survey/config";
import { surveyResults } from "@/lib/survey/server";
import { adminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TITLE = "סקר התעריפים ותנאי התשלום 2026";
const DESC = "כמה גובים במושן, אנימציה, VFX, פוסט, סאונד ועיצוב בישראל, ומתי באמת משלמים. 4 דקות. התשובות חסויות: לא מוצגות לאף אחד, ומתפרסמים רק נתונים מצטברים.";

export const metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, type: "website", locale: "he_IL", siteName: "Landscape", images: [{ url: "/og/survey.png", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og/survey.png"] },
};

export default async function SurveyPage() {
  const res = await surveyResults(adminClient()).catch(() => null);
  const nb = res?.data?.nb || 0;
  const open = isOpen();
  return (
    <>
      <RefCapture />
      <section className="wrap">
        <div className="hero">
          <span className="eyebrow"><SparkIcon size={14} /> {open ? `פתוח עד ${CLOSES_LABEL}` : "הסקר נסגר"}</span>
          <h1>כמה גובים בתעשייה? <em>ומתי באמת משלמים?</em></h1>
          <p className="lead">
            סקר התעריפים ותנאי התשלום של אנשי מושן, אנימציה, VFX, פוסט, סאונד ועיצוב בישראל.
            4 דקות. התשובות חסויות: לא מוצגות לאף אחד, ומתפרסמים רק נתונים מצטברים.
          </p>
          {nb >= 10 && <p className="small muted">{nb}+ תשובות עד עכשיו</p>}
        </div>
      </section>

      <section className="wrap narrow">
        <SurveyCta open={open} />
      </section>

      <section className="wrap section">
        <div className="intro"><h2>למה הסקר הזה</h2></div>
        <div className="grid fit features">
          <div className="feature">
            <div>
              <h3>אין נתונים פתוחים</h3>
              <p className="muted">על שכר מעצבי UX יש סקרים. על תעריפי מושן, אנימציה, VFX, פוסט וסאונד כמעט אין כלום, וכל אחד מתמחר לבד.</p>
            </div>
          </div>
          <div className="feature">
            <div>
              <h3>שוטף + 60 הפך לנורמלי</h3>
              <p className="muted">תנאי התשלום והאיחורים הם חלק מהתעריף. שואלים גם עליהם, כדי לדעת מה מקובל ומה כבר מוגזם.</p>
            </div>
          </div>
          <div className="feature">
            <div>
              <h3>AI משנה את המחירים</h3>
              <p className="muted">בודקים ביחד אם הביקוש והתעריפים בכל תחום עלו או ירדו בשנה האחרונה.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap narrow section tight">
        <div className="grid fit">
          <div className="card stack">
            <h2>מה שואלים</h2>
            <ul className="ticks">
              <li>תחום, צורת עבודה, ניסיון ואזור</li>
              <li>תעריף לשעה או ליום, או שכר חודשי בשכירות</li>
              <li>מחיר טיפוסי לשתיים־שלוש עבודות נפוצות בתחום</li>
              <li>תנאי תשלום, איחורים ומי הלקוחות</li>
              <li>איך מגיעים לקוחות, ומה AI עושה לעבודה</li>
            </ul>
            <p className="small muted">לא שואלים על שמות של לקוחות או של חברות.</p>
          </div>
          <div className="card stack" id="anon">
            <h2>מה קורה עם התשובות</h2>
            <ul className="ticks">
              <li>התשובות חסויות: לא מוצגות לאף אחד. צוות Landscape ניגש לנתונים רק לצורך תפעול.</li>
              <li>מתפרסמים רק חציון וטווח של קבוצות עם {K_MIN} משיבים לפחות, אחוזים מעוגלים, ופעם ביום לכל היותר.</li>
              <li>טקסט חופשי לא מתפרסם אף פעם.</li>
              <li>מחיקת החשבון מוחקת גם את התשובות.</li>
            </ul>
            <p className="small muted">
              תוצאות ביניים פתוחות למשיבים כבר עכשיו, והדוח המלא יתפרסם ב{RESULTS_LABEL}.{" "}
              <a href="/privacy#survey">עוד על הפרטיות</a>
            </p>
          </div>
        </div>
        <p className="center" style={{ marginBlockStart: 32 }}>
          <a className="btn" href="/survey/results">לתוצאות</a>
        </p>
      </section>
    </>
  );
}
