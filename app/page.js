import { readFileSync } from "node:fs";
import path from "node:path";
import SignupForm from "@/components/SignupForm";
import AuthNotice from "@/components/AuthNotice";

function mapStats() {
  try {
    const d = JSON.parse(readFileSync(path.join(process.cwd(), "site/data/dataset.json"), "utf8"));
    const s = JSON.parse(readFileSync(path.join(process.cwd(), "site/data/signals.json"), "utf8"));
    const byKind = (k) => d.orgs.filter((o) => o.kind === k).length;
    return { orgs: d.orgs.length, studios: byKind("studio") + byKind("production_company"), clients: byKind("client") + byKind("agency"), signals: s.signals.length };
  } catch {
    return null;
  }
}

export default function Home() {
  const stats = mapStats();
  return (
    <>
      <section className="hero wrap">
        <AuthNotice />
        <h1>כל תעשיית הקריאייטיב בישראל. במקום אחד.</h1>
        <p className="lead">
          מפה חיה של סטודיואים, חברות ולקוחות, ועכשיו גם של האנשים. מעלים קורות חיים, לינקדאין או פורטפוליו, והפרופיל נבנה לבד.
        </p>
        {stats && (
          <div className="kpis" aria-label="מה יש במפה">
            <div className="kpi"><b>{stats.orgs}</b><span>ארגונים במפה</span></div>
            <div className="kpi"><b>{stats.studios}</b><span>סטודיואים וחברות הפקה</span></div>
            <div className="kpi"><b>{stats.clients}</b><span>מותגים וסוכנויות</span></div>
            <div className="kpi"><b>{stats.signals}</b><span>סיגנלים מהשוק</span></div>
          </div>
        )}
      </section>

      <section className="wrap section" id="join">
        <div className="card narrow">
          <h2>הצטרפות לקהילה</h2>
          <p className="muted">משאירים מייל, נכנסים מהקישור, ותוך דקה יש פרופיל.</p>
          <SignupForm />
        </div>
      </section>

      <section className="wrap section">
        <h2>איך זה עובד</h2>
        <div className="steps">
          <div className="card">
            <h3>נותנים לנו נקודת פתיחה</h3>
            <p className="muted">PDF של קורות חיים או של הלינקדאין, קישור לביהנס, וימאו או לאתר. או כמה מילים על עצמך.</p>
          </div>
          <div className="card">
            <h3>ה־AI בונה טיוטה</h3>
            <p className="muted">תחומים, כלים, ניסיון וקישורים. מה שחסר נשאל בשאלון קצר, רק את מה שחסר.</p>
          </div>
          <div className="card">
            <h3>את/ה מאשר/ת ומחליט/ה מי רואה</h3>
            <p className="muted">ציבורי, חברי קהילה בלבד, או מוסתר. שום דבר לא עולה בלי אישור.</p>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2>מה מקבלים</h2>
        <div className="grid">
          <div className="card">
            <h3>להימצא</h3>
            <p className="muted">סטודיואים, סוכנויות ומותגים מחפשים אנשים לפי תחום ועיר.</p>
          </div>
          <div className="card">
            <h3>למצוא</h3>
            <p className="muted">אנשים לשיתופי פעולה, וחברות שקונות בדיוק את מה שאת/ה עושה. <a href="/map/app.html">למפה</a></p>
          </div>
          <div className="card">
            <h3>לדעת ראשון/ה</h3>
            <p className="muted">ניוזלטר בתדירות שבוחרים: מי גייס, מי החליף סוכנות, מי מחפש. רק התחומים שלך.</p>
          </div>
        </div>
      </section>
    </>
  );
}
