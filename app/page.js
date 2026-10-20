import SignupForm from "@/components/SignupForm";
import AuthNotice from "@/components/AuthNotice";
import ComingSoon from "@/components/ComingSoon";
import { SearchIcon, PeopleIcon, BuildingIcon, BellIcon, CraftIcon, SparkIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, companiesWithCraft } from "@/lib/companies";
import { supabaseConfig } from "@/lib/config";

// Eight crafts for the home page, with short names (the full taxonomy names are on hover and on the search page).
const CRAFTS = { "motion-design": "מושן", "animation-3d": "תלת־ממד", vfx: "VFX ואפקטים", branding: "מיתוג וזהות", "sound-design": "סאונד", editing: "עריכה", illustration: "איור", "ai-creative": "יצירה עם AI" };

export default function Home() {
  const open = Boolean(supabaseConfig());
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow"><SparkIcon size={14} /> {STATS.orgs} חברות ו־{STATS.people} אנשים במאגר</span>
          <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
          <p className="lead">מוצאים לקוחות, סטודיואים ואנשי מקצוע לפי מה שאתם עושים. ובונים פרופיל מקצועי בדקה, ישר מקורות החיים או מהפורטפוליו.</p>
          <form className="psearch lg searchbox" role="search" action="/search">
            <input type="search" name="q" placeholder="תחום, חברה או שם" aria-label="חיפוש בכל האתר" />
            <button className="go" aria-label="חיפוש"><SearchIcon size={22} /></button>
          </form>
        </div>
      </section>

      <section className="wrap section tight" aria-labelledby="crafts-h">
        <h2 id="crafts-h" className="sr-only">חיפוש לפי תחום</h2>
        <div className="crafts row8 scroll">
          {Object.entries(CRAFTS).map(([c, label]) => {
            const n = companiesWithCraft(c);
            return (
              <a key={c} className="craft" href={`/search?craft=${c}`} title={craftLabel(c)}>
                <span className="ico"><CraftIcon craft={c} size={28} /></span>
                <span className="lbl">{label}</span>
                {n >= 10 && <span className="n">{n} חברות</span>}
              </a>
            );
          })}
        </div>
      </section>

      <section className="wrap section">
        <div className="intro">
          <h2>מה אפשר לעשות כאן</h2>
          <p>פחות ניחושים, פחות טלפונים.</p>
        </div>
        <div className="grid fit">
          <a className="feature" href="/companies">
            <div className="ico"><BuildingIcon size={22} /></div>
            <h3>למצוא לקוחות</h3>
            <p className="muted">מותגים וסוכנויות לפי מה שהם מזמינים: מושן, תלת־ממד, סושיאל, סאונד. עם משרד הפרסום שלהם ומה השתנה אצלם לאחרונה.</p>
          </a>
          <a className="feature" href="/people">
            <div className="ico"><PeopleIcon size={22} /></div>
            <h3>למצוא שותפים</h3>
            <p className="muted">אנשי מקצוע וסטודיואים לפי תחום ועיר. לפרויקט הבא, לשיתוף פעולה או לגיוס.</p>
          </a>
          <a className="feature" href="/companies#signals">
            <div className="ico"><BellIcon size={22} /></div>
            <h3>לדעת לפני כולם</h3>
            <p className="muted">עדכונים מהשוק: מי גייס, מי החליף משרד פרסום, מי מינה מנהל שיווק חדש. ובקרוב גם ניוזלטר, רק בתחומים שלכם.</p>
          </a>
        </div>
      </section>

      <section className="wrap section">
        <div className="intro">
          <h2>פרופיל בלי למלא טפסים</h2>
          <p>נותנים נקודת פתיחה, ה־AI מכין טיוטה, ואתם מאשרים.</p>
        </div>
        <div className="steps">
          <div className="feature">
            <h3>מעלים חומר</h3>
            <p className="muted">קורות חיים, PDF מלינקדאין או קישור ל־Behance, ל־Vimeo או לאתר. אפשר גם כמה מילים.</p>
          </div>
          <div className="feature">
            <h3>מקבלים טיוטה</h3>
            <p className="muted">תחומים, כלים, ניסיון וקישורים. מה שחסר נשאל בשאלון קצר.</p>
          </div>
          <div className="feature">
            <h3>מאשרים ובוחרים מי רואה</h3>
            <p className="muted">כולם, רק חברי הקהילה, או אף אחד בינתיים. שום דבר לא עולה בלי אישור.</p>
          </div>
        </div>
      </section>

      <section className="wrap section" id="join">
        {open ? (
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
        ) : (
          <ComingSoon as="h2" title="ההרשמה לקהילה נפתחת בקרוב" text="בינתיים כל החברות והאנשים במאגר פתוחים לעיון, בלי הרשמה." />
        )}
      </section>
    </>
  );
}
