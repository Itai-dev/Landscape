import SignupForm from "@/components/SignupForm";
import AuthNotice from "@/components/AuthNotice";
import SurveyBanner from "@/components/SurveyBanner";
import { SearchIcon, PeopleIcon, BuildingIcon, BellIcon, CraftIcon, SparkIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, companiesWithCraft } from "@/lib/companies";
import { supabaseConfig } from "@/lib/config";

// Eight crafts on the home page, named exactly as everywhere else on the site (schema/taxonomy.json).
const CRAFTS = ["motion-design", "animation-3d", "vfx", "branding", "sound-design", "editing", "illustration", "ai-creative"];

export default function Home() {
  const open = Boolean(supabaseConfig());
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow"><SparkIcon size={14} /> {STATS.orgs} חברות ו־{STATS.people} אנשים במאגר</span>
          <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
          <p className="lead">
            מוצאים לקוחות, סטודיואים ואנשי מקצוע לפי מה שאתם עושים.
            {open && <span className="wide"> ובונים פרופיל מקצועי בדקה, ישר מתוך קורות החיים או מהפורטפוליו.</span>}
          </p>
          <form className="psearch lg searchbox" role="search" action="/search">
            <input type="search" name="q" placeholder="תחום, חברה או שם" aria-label="חיפוש בכל האתר" />
            <button className="go" aria-label="חיפוש"><SearchIcon size={22} /></button>
          </form>
        </div>
        <SurveyBanner />
      </section>

      <section className="wrap section tight" aria-labelledby="crafts-h">
        <h2 id="crafts-h" className="sr-only">חיפוש לפי תחום</h2>
        <div className="crafts row8 scroll">
          {CRAFTS.map((c) => {
            const n = companiesWithCraft(c);
            return (
              <a key={c} className="craft" href={`/search?craft=${c}`}>
                <span className="ico"><CraftIcon craft={c} size={28} /></span>
                <span className="lbl">{craftLabel(c)}</span>
                {n >= 10 ? <span className="n">{n} חברות</span> : <span className="n" aria-hidden>&nbsp;</span>}
              </a>
            );
          })}
        </div>
      </section>

      <section className="wrap section">
        <div className="intro">
          <h2>מה אפשר לעשות כאן</h2>
        </div>
        <div className="grid fit features">
          <a className="feature" href="/companies">
            <div className="ico"><BuildingIcon size={22} /></div>
            <div>
              <h3>למצוא לקוחות</h3>
              <p className="muted">מותגים ומשרדי פרסום לפי מה שהם מזמינים, עם המשרד שלהם ומה השתנה אצלם לאחרונה.</p>
            </div>
          </a>
          <a className="feature" href="/people">
            <div className="ico"><PeopleIcon size={22} /></div>
            <div>
              <h3>למצוא שותפים</h3>
              <p className="muted">אנשי מקצוע וסטודיואים לפי תחום ועיר, לפרויקט הבא או לגיוס.</p>
            </div>
          </a>
          <a className="feature" href="/companies#signals">
            <div className="ico"><BellIcon size={22} /></div>
            <div>
              <h3>לדעת לפני כולם</h3>
              <p className="muted">מי גייס, מי החליף משרד פרסום ומי מינה מנהל שיווק חדש.</p>
            </div>
          </a>
        </div>
      </section>

      {open && (
        <section className="wrap section" id="join">
          <div className="panel join">
            <div>
              <h2>הצטרפות לקהילה</h2>
              <p className="muted">משאירים מייל, נכנסים מהקישור, ותוך דקה יש פרופיל. בלי סיסמה ובלי טפסים: ה־AI מכין טיוטה, ואתם מאשרים.</p>
              <ul className="ticks">
                <li>טיוטה אוטומטית מתוך קורות החיים או מהפורטפוליו</li>
                <li>שליטה מלאה במי שרואה את הפרופיל</li>
                <li>ניוזלטר רק אם רוצים, בתדירות שבוחרים</li>
              </ul>
            </div>
            <div className="form"><SignupForm /></div>
          </div>
        </section>
      )}
    </>
  );
}
