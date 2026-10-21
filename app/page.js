import SignupForm from "@/components/SignupForm";
import DigestSubscribe from "@/components/DigestSubscribe";
import AuthNotice from "@/components/AuthNotice";
import { PeopleIcon, BuildingIcon, BellIcon, CraftIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, companiesWithCraft } from "@/lib/companies";
import { supabaseConfig, PROFILES_ENABLED } from "@/lib/config";
import TenderCard from "@/components/TenderCard";
import { listTenders } from "@/lib/tenders";
import "./tenders/tenders.css";

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

// Eight crafts on the home page, named exactly as everywhere else on the site (schema/taxonomy.json).
const CRAFTS = ["motion-design", "animation-3d", "vfx", "branding", "sound-design", "editing", "illustration", "ai-creative"];

export default function Home() {
  const open = Boolean(supabaseConfig());
  const tenders = listTenders();
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow">{STATS.orgs} חברות ו־{STATS.people} אנשים במאגר</span>
          {PROFILES_ENABLED
            ? <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
            : <h1>מי מזמין מה בתעשיית הקריאייטיב. <em>ומה השתנה השבוע.</em></h1>}
          {PROFILES_ENABLED ? (
            <p className="lead">
              מוצאים לקוחות, סטודיואים ואנשי מקצוע לפי מה שאתם עושים.
              {open && <span className="wide"> ובונים פרופיל מקצועי בדקה, ישר מתוך קורות החיים או מהפורטפוליו.</span>}
            </p>
          ) : (
            <p className="lead">
              מותגים, משרדי פרסום וסטודיואים לפי מה שהם מזמינים, עם הסיבה לפנות עכשיו. חינם, לפי התחום שלכם.
            </p>
          )}
          <div className="row">
            <a className="btn primary lg" href="/companies">לכל החברות</a>
            <a className="btn lg" href="/digest">השבוע בתעשייה</a>
          </div>
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="crafts-h">
        <div className="sechead">
          <h2 id="crafts-h">לפי תחום</h2>
          <a className="btn" href="/search">לכל התחומים</a>
        </div>
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

      {tenders.length > 0 && (
        <section className="wrap section tstrip reveal" aria-labelledby="tenders-h">
          <div className="sechead">
            <h2 id="tenders-h">מכרזים פתוחים <span className="count">{tenders.length}</span></h2>
            <a className="btn" href="/tenders">לכל המכרזים</a>
          </div>
          <div className="tgrid">{tenders.slice(0, 3).map((t) => <TenderCard key={t.id} t={t} compact />)}</div>
        </section>
      )}

      <section className="wrap section reveal" aria-labelledby="what-h">
        <div className="sechead">
          <h2 id="what-h">{PROFILES_ENABLED ? "מה אפשר לעשות כאן" : "מה מקבלים כאן"}</h2>
          <a className="btn" href="/companies">לכל החברות</a>
        </div>
        <div className="rows">
          <a className="feature" href="/companies">
            <div className="ico"><BuildingIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "למצוא לקוחות" : "מי מזמין מה"}</h3>
              <p className="muted">מותגים ומשרדי פרסום לפי מה שהם מזמינים, עם המשרד שלהם ומה השתנה אצלם לאחרונה.</p>
            </div>
          </a>
          <a className="feature" href="/people">
            <div className="ico"><PeopleIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "למצוא שותפים" : "מי מחליט"}</h3>
              <p className="muted">{PROFILES_ENABLED ? "אנשי מקצוע וסטודיואים לפי תחום ועיר, לפרויקט הבא או לגיוס." : "מנהלי שיווק, הפקה וקריאייטיב בחברות, לפי מה שפורסם בפומבי ועם המקור."}</p>
            </div>
          </a>
          <a className="feature" href="/companies#signals">
            <div className="ico"><BellIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "לדעת לפני כולם" : "מה השתנה ולמה עכשיו"}</h3>
              <p className="muted">גיוסים, החלפות משרד פרסום ומינויים חדשים בשיווק, וכל עדכון עם הסיבה שהוא רלוונטי.</p>
            </div>
          </a>
        </div>
      </section>

      <section className="wrap section reveal" id="join" aria-labelledby="join-h">
        {PROFILES_ENABLED ? (
          <div className="panel inverse join">
            <div className="stack">
              <h2 id="join-h">{open ? "הצטרפות, והגיליון במייל" : "השבוע בתעשייה"}</h2>
              <p className="muted">
                כל יום ראשון: מינויים בשיווק, החלפות משרד פרסום ומי מזמין את מה שאתם עושים. לפי התחומים שלכם, עם סיבה לפנות.
                {open && " ובאותה הרשמה גם פרופיל מקצועי: ה־AI מכין טיוטה מתוך קורות החיים או הפורטפוליו, ואתם מאשרים."}
              </p>
              <p><a className="btn inv" href="/digest">לגיליון של השבוע</a></p>
            </div>
            {open && <div className="form"><SignupForm /></div>}
          </div>
        ) : (
          <div className="panel inverse join">
            <div className="stack">
              <h2 id="join-h">השבוע בתעשייה, במייל</h2>
              <p className="muted">
                כל יום ראשון בבוקר: מינויים בשיווק, החלפות משרד, קמפיינים ומי עשה אותם, מכרזים פתוחים, ומי מזמין עכשיו את מה שאתם עושים. לפי התחומים שלכם, חינם.
              </p>
              <p><a className="btn inv" href="/digest">לגיליון של השבוע</a></p>
            </div>
            <div className="form"><DigestSubscribe id="home-subscribe" /></div>
          </div>
        )}
      </section>
    </>
  );
}
