import SignupForm from "@/components/SignupForm";
import AuthNotice from "@/components/AuthNotice";
import { SearchIcon, PeopleIcon, BuildingIcon, BellIcon, CraftIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, ORGS } from "@/lib/companies";

// Short names for the quick-search chips; the full taxonomy names are long.
const POPULAR = { "motion-design": "מושן", "animation-3d": "תלת־ממד", branding: "מיתוג", vfx: "VFX", editing: "עריכה", "sound-design": "סאונד", illustration: "איור" };
const CRAFTS = { "motion-design": "מושן", "animation-3d": "אנימציית תלת־ממד", vfx: "VFX ואפקטים", branding: "מיתוג וזהות", "sound-design": "סאונד", editing: "עריכה", illustration: "איור", "ai-creative": "יצירה עם AI" };
const companiesIn = (c) => ORGS.filter((o) => o.categories.includes(c)).length;

export default function Home() {
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow"><SparkIcon16 /> {STATS.orgs} חברות ו־{STATS.people} אנשים במאגר</span>
          <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
          <p className="lead">מוצאים סטודיו, פרילנסר או מותג שמחפש בדיוק את מה שאתם עושים. ובונים פרופיל מקצועי בדקה, מקורות החיים או מהפורטפוליו.</p>
          <form className="psearch lg searchbox" role="search" action="/search">
            <input type="search" name="q" placeholder="תחום, חברה או שם" aria-label="חיפוש אנשים וחברות" />
            <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
          </form>
          <div className="popular">
            <b>חיפושים נפוצים:</b>
            {Object.entries(POPULAR).map(([c, label]) => <a key={c} className="tag" href={`/search?craft=${c}`}>{label}</a>)}
          </div>
        </div>
      </section>

      <section className="wrap section tight" aria-labelledby="crafts-h">
        <h2 id="crafts-h" className="sr-only">תחומים</h2>
        <div className="crafts row8">
          {Object.entries(CRAFTS).map(([c, label]) => (
            <a key={c} className="craft" href={`/search?craft=${c}`} title={craftLabel(c)}>
              <span className="ico"><CraftIcon craft={c} size={28} /></span>
              {label}
              <span className="n">{companiesIn(c)} חברות</span>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="kpis" aria-label="מה יש במאגר">
          <a className="kpi" href="/companies"><b>{STATS.orgs}</b><span>חברות במאגר</span></a>
          <a className="kpi" href="/companies"><b>{STATS.makers}</b><span>סטודיואים וחברות הפקה</span></a>
          <a className="kpi" href="/companies"><b>{STATS.buyers}</b><span>מותגים וסוכנויות</span></a>
          <a className="kpi" href="/people"><b>{STATS.people}</b><span>אנשים בתפקידי מפתח</span></a>
        </div>
      </section>

      <section className="wrap section">
        <div className="intro">
          <h2>מה אפשר לעשות כאן</h2>
          <p>שלושה דברים שחוסכים חיפוש, טלפונים ותחושת בטן.</p>
        </div>
        <div className="grid fit">
          <div className="feature">
            <div className="ico"><BuildingIcon size={22} /></div>
            <h3>למצוא לקוחות</h3>
            <p className="muted">מותגים וסוכנויות לפי מה שהם קונים: מושן, תלת־ממד, סושיאל, סאונד. עם המשרד שעובד איתם ומה השתנה אצלם לאחרונה.</p>
          </div>
          <div className="feature">
            <div className="ico"><PeopleIcon size={22} /></div>
            <h3>למצוא שותפים</h3>
            <p className="muted">אנשי מקצוע וסטודיואים לפי תחום ועיר. למשימה הבאה, לפרויקט משותף או לגיוס.</p>
          </div>
          <div className="feature">
            <div className="ico"><BellIcon size={22} /></div>
            <h3>לדעת לפני כולם</h3>
            <p className="muted">ניוזלטר בתדירות שבוחרים: מי גייס, מי החליף משרד פרסום, מי מחפש. רק התחומים שלכם.</p>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="intro">
          <h2>פרופיל בלי למלא טפסים</h2>
          <p>נותנים נקודת פתיחה, ה־AI מכין טיוטה, ואתם מאשרים.</p>
        </div>
        <div className="steps">
          <div className="card">
            <h3>מעלים חומר</h3>
            <p className="muted">PDF של קורות חיים או של לינקדאין, קישור ל־Behance, Vimeo או לאתר. או כמה מילים.</p>
          </div>
          <div className="card">
            <h3>מקבלים טיוטה</h3>
            <p className="muted">תחומים, כלים, ניסיון וקישורים. מה שחסר נשאל בשאלון קצר.</p>
          </div>
          <div className="card">
            <h3>מאשרים ומחליטים מי רואה</h3>
            <p className="muted">ציבורי, חברי קהילה בלבד, או מוסתר. שום דבר לא עולה בלי אישור.</p>
          </div>
        </div>
      </section>

      <section className="wrap section" id="join">
        <div className="panel join">
          <div>
            <h2>הצטרפות לקהילה</h2>
            <p className="muted">משאירים מייל, נכנסים מהקישור, ותוך דקה יש פרופיל. בלי סיסמה.</p>
            <ul className="ticks">
              <li>טיוטה אוטומטית מקורות החיים או מהפורטפוליו</li>
              <li>שליטה מלאה במי שרואה את הפרופיל</li>
              <li>ניוזלטר רק אם רוצים, בתדירות שבוחרים</li>
            </ul>
          </div>
          <div className="form"><SignupForm /></div>
        </div>
      </section>
    </>
  );
}

function SparkIcon16() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.2 6.2L20.5 10l-6.3 1.8L12 18l-2.2-6.2L3.5 10l6.3-1.8z" />
    </svg>
  );
}
