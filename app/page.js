import { readFileSync } from "node:fs";
import path from "node:path";
import SignupForm from "@/components/SignupForm";
import AuthNotice from "@/components/AuthNotice";
import { SearchIcon, PeopleIcon, MapIcon, BellIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";

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

const POPULAR = ["motion-design", "animation-3d", "branding", "vfx", "editing", "sound-design", "illustration", "ai-creative"];
const TILES = ["motion-design", "branding", "vfx", "sound-design"];

export default function Home() {
  const stats = mapStats();
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap hero">
        <div>
          <nav className="seg" aria-label="מה מחפשים">
            <a className="on" href="/people" aria-current="page">אנשים</a>
            <a href="/map/app.html">סטודיואים ולקוחות</a>
          </nav>
          <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
          <ul className="ticks">
            <li>מעלים קורות חיים, לינקדאין או פורטפוליו. הפרופיל נבנה לבד.</li>
            <li>מוצאים אנשים לשיתופי פעולה, וחברות שקונות בדיוק את מה שאת/ה עושה.</li>
            <li>מקבלים עדכונים: מי גייס, מי החליף סוכנות, מי מחפש.</li>
          </ul>
          <div className="row">
            <a className="btn primary lg" href="/onboard">בניית פרופיל בדקה</a>
            <a className="btn lg" href="/map/app.html">למפה</a>
          </div>
        </div>
        <div className="showcase" aria-hidden>
          <div className="mosaic">
            {TILES.map((c, i) => <div key={c} className={`tile t${i + 1}`}><span>{craftLabel(c)}</span></div>)}
          </div>
          {stats && <div className="floater"><span className="dot">IL</span>{stats.orgs} ארגונים במפה</div>}
        </div>
      </section>

      <section className="wrap section">
        <nav className="tabs" aria-label="חיפוש">
          <a className="on" href="/people"><PeopleIcon /> אנשים</a>
          <a href="/map/app.html"><MapIcon /> ארגונים במפה</a>
        </nav>
        <form className="psearch" role="search" action="/people">
          <input type="search" name="q" placeholder="את מי מחפשים? למשל: אנימטור 3D בתל אביב" aria-label="חיפוש אנשים" />
          <button className="go" aria-label="חיפוש"><SearchIcon /></button>
        </form>
        <div className="popular">
          <b>פופולרי:</b>
          {POPULAR.map((c) => <a key={c} className="tag" href={`/people?craft=${c}`}>{craftLabel(c)}</a>)}
        </div>
      </section>

      {stats && (
        <section className="wrap section">
          <div className="kpis" aria-label="מה יש במפה">
            <div className="kpi"><b>{stats.orgs}</b><span>ארגונים במפה</span></div>
            <div className="kpi"><b>{stats.studios}</b><span>סטודיואים וחברות הפקה</span></div>
            <div className="kpi"><b>{stats.clients}</b><span>מותגים וסוכנויות</span></div>
            <div className="kpi"><b>{stats.signals}</b><span>סיגנלים מהשוק</span></div>
          </div>
        </section>
      )}

      <section className="wrap section" id="join">
        <div className="panel join">
          <div>
            <h2>הצטרפות לקהילה</h2>
            <p className="muted">משאירים מייל, נכנסים מהקישור, ותוך דקה יש פרופיל. בלי סיסמה, ושום דבר לא מתפרסם בלי אישור שלך.</p>
            <ul className="ticks small" style={{ marginBlockEnd: 0 }}>
              <li>טיוטה אוטומטית מקורות החיים או מהפורטפוליו</li>
              <li>את/ה מחליט/ה מי רואה: ציבורי, חברי קהילה, או מוסתר</li>
              <li>ניוזלטר רק אם בחרת, בתדירות שבחרת</li>
            </ul>
          </div>
          <div className="form"><SignupForm /></div>
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
        <div className="grid fit">
          <div className="feature">
            <div className="ico"><PeopleIcon /></div>
            <h3>להימצא</h3>
            <p className="muted">סטודיואים, סוכנויות ומותגים מחפשים אנשים לפי תחום ועיר.</p>
          </div>
          <div className="feature">
            <div className="ico"><MapIcon /></div>
            <h3>למצוא</h3>
            <p className="muted">אנשים לשיתופי פעולה, וחברות שקונות בדיוק את מה שאת/ה עושה. <a href="/map/app.html">למפה</a></p>
          </div>
          <div className="feature">
            <div className="ico"><BellIcon /></div>
            <h3>לדעת ראשון/ה</h3>
            <p className="muted">ניוזלטר בתדירות שבוחרים: מי גייס, מי החליף סוכנות, מי מחפש. רק התחומים שלך.</p>
          </div>
        </div>
      </section>
    </>
  );
}
