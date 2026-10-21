import SignupForm from "@/components/SignupForm";
import DigestSubscribe from "@/components/DigestSubscribe";
import AuthNotice from "@/components/AuthNotice";
import SurveyBanner from "@/components/SurveyBanner";
import { SearchIcon, PeopleIcon, BuildingIcon, BellIcon, CraftIcon, SparkIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, companiesWithCraft } from "@/lib/companies";
import { supabaseConfig, PROFILES_ENABLED } from "@/lib/config";
import TenderCard from "@/components/TenderCard";
import { listTenders } from "@/lib/tenders";
import "./tenders/tenders.css";
import "./sell.css";
import DigestPreview from "@/components/DigestPreview";
import { liveProof } from "@/lib/proof";
import { composeDigest } from "@/lib/digest";

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

// Eight crafts on the home page, named exactly as everywhere else on the site (schema/taxonomy.json).
const CRAFTS = ["motion-design", "animation-3d", "vfx", "branding", "sound-design", "editing", "illustration", "ai-creative"];

// Crafts the home-page digest preview can switch between.
const PREVIEW_CRAFTS = ["motion-design", "animation-3d", "branding", "sound-design", "editing"];

function previewEditions(now) {
  return PREVIEW_CRAFTS.map((slug) => {
    const d = composeDigest({ crafts: [slug], now, base: "", maxItems: 3, maxPicks: 1, maxTenders: 1 });
    const items = [...d.items, ...d.more].slice(0, 3).map((i) => ({ id: i.id, label: i.label, day: i.day, headline: i.headline }));
    const t = d.tenders[0];
    const p = d.picks[0];
    return {
      slug,
      label: craftLabel(slug),
      range: d.range,
      items,
      tender: t ? { summary: t.summary, countdown: t.countdown } : null,
      pick: p?.org ? { name: p.org.name, reason: p.reason } : null,
    };
  });
}

const FAQ = [
  ["זה באמת בחינם?", "כן. הגיליון, החיפוש, המכרזים וההתראות בחינם. אין כרטיס אשראי ואין תקופת ניסיון."],
  ["מאיפה המידע?", "מפרסומים פומביים: אתרי החברות, ICE, גלובס, CTech, Geektime, משרות בלינקדאין ואתר מנהל הרכש הממשלתי. ליד כל פרט מופיע המקור שלו."],
  ["כמה מיילים אקבל?", "עד מייל אחד בשבוע, ביום ראשון בבוקר. אפשר לבחור כל שבועיים או פעם בחודש. התראות על חברות הן בחירה נפרדת."],
  ["מה עושים עם המייל שלי?", "שולחים אליו רק את מה שביקשתם. לא מוכרים ולא משתפים אותו, ואפשר להסיר את ההרשמה בלחיצה אחת מכל מייל."],
  ["למה לא פשוט לינקדאין או ICE?", "אפשר, אם יש שעה ביום. כאן זה מסונן לפי התחום שלכם, מרוכז במייל אחד, ולכל עדכון כתוב למה הוא רלוונטי ומי מזמין."],
  ["מופיעים במאגר ורוצים להסיר?", "בכל כרטיס יש בתפריט ⋯ ״בקשת הסרה״. הכרטיס יורד מהאתר מיד אחרי השליחה."],
];

export default function Home() {
  const open = Boolean(supabaseConfig());
  const tenders = listTenders();
  if (PROFILES_ENABLED) return <ProfilesHome open={open} tenders={tenders} />;
  const now = new Date();
  const proof = liveProof(now);
  const editions = previewEditions(now);
  const near = proof.nearestTender;
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero sell">
          <span className="eyebrow"><SparkIcon size={14} />
            {proof.updates} עדכונים בשבועיים האחרונים{proof.openTenders ? ` · ${proof.openTenders} מכרזים פתוחים` : ""}
          </span>
          <h1>לא צריך להכיר את כולם. <em>צריך לדעת מי מזמין, ומתי לפנות.</em></h1>
          <p className="lead">
            כל יום ראשון במייל: מי מונה לשיווק, מי החליף משרד, אילו מכרזים נפתחו ומי מזמין את מה שאתם עושים. לפי התחום שלכם, עם הסיבה לפנות עכשיו. חינם.
          </p>
          <div className="herobox">
            <DigestSubscribe id="hero-subscribe" compact where="home-hero" />
          </div>
        </div>

        <div className="proof" aria-labelledby="proof-h">
          <h2 id="proof-h" className="ptitle">מה נכנס לגיליון השבוע</h2>
          <ul className="plist">
            {proof.latest.map((i) => (
              <li key={i.id}>
                <a href={i.href} data-track="proof_item_open">
                  <span className="lbl">{i.label} · {i.day}{i.source ? <> · <bdi>{i.source}</bdi></> : ""}</span>
                  <span className="hl">{i.headline}</span>
                </a>
              </li>
            ))}
            {near && (
              <li className="ptender">
                <a href="/tenders" data-track="tender_open">
                  <span className="lbl">מכרז פתוח · {near.countdown.text}</span>
                  <span className="hl">{near.scope_summary}</span>
                </a>
              </li>
            )}
          </ul>
          <p className="psrc small muted">כל פרט עם מקור: {proof.sources.join(", ")} ואתר מנהל הרכש הממשלתי.</p>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="ba-h">
        <div className="intro"><h2 id="ba-h">ככה זה היום, וככה זה עם הגיליון</h2></div>
        <div className="ba">
          <div className="col before">
            <h3>בלי</h3>
            <ul>
              <li>שולחים פורטפוליו לכתובת כללית, ומחכים.</li>
              <li>שומעים על מנהלת השיווק החדשה אחרי שכבר בחרה ספקים.</li>
              <li>שעה ביום בלינקדאין וב־ICE, כדי למצוא עדכון אחד שרלוונטי.</li>
              <li>מנחשים כמה לגבות, ומקבלים שוטף+90.</li>
            </ul>
          </div>
          <div className="col after">
            <h3>עם Landscape</h3>
            <ul>
              <li>יודעים מי מחליט אצל המותג, ומה הוא מזמין, לפני שפונים.</li>
              <li>שומעים על מינוי או החלפת משרד באותו שבוע.</li>
              <li>מייל אחד ביום ראשון, חמש דקות קריאה, רק מה ששייך לתחום שלכם.</li>
              <li>רואים כמה גובים אחרים בתחום, בסקר התעריפים.</li>
            </ul>
          </div>
        </div>
      </section>

      {proof.examples.length > 0 && (
        <section className="wrap section examples-sec" aria-labelledby="ex-h">
          <div className="intro">
            <h2 id="ex-h">דוגמאות מהשבועות האחרונים</h2>
            <p className="muted">עדכונים אמיתיים מהמאגר. כל אחד מהם הוא סיבה טובה לפנות.</p>
          </div>
          <div className="grid fit examples">
            {proof.examples.map((x) => (
              <a key={x.kind} className="feature ex" href={x.href} data-track={x.kind === "tender" ? "tender_open" : "example_open"}>
                <span className="lbl">{x.title}</span>
                <p className="hl">{x.headline}</p>
                <p className="small muted">{x.org?.name ? <><bdi>{x.org.name}</bdi> · </> : ""}{x.day}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="wrap section tight search-sec" aria-labelledby="crafts-h">
        <div className="intro">
          <h2 id="crafts-h">או לחפש עכשיו</h2>
        </div>
        <form className="psearch lg searchbox narrow" role="search" action="/search">
          <input type="search" name="q" placeholder="תחום, חברה או שם" aria-label="חיפוש בכל האתר" />
          <button className="go" aria-label="חיפוש"><SearchIcon size={22} /></button>
        </form>
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
        <section className="wrap tstrip" aria-labelledby="tenders-h">
          <div className="subhead">
            <h2 id="tenders-h">מכרזים פתוחים עכשיו <span className="count">{tenders.length}</span></h2>
            <a href="/tenders" data-track="tender_open">לכל המכרזים ‹</a>
          </div>
          <div className="tgrid">{tenders.slice(0, 3).map((t) => <TenderCard key={t.id} t={t} compact />)}</div>
        </section>
      )}

      <section className="wrap section" id="join" aria-labelledby="join-h">
        <div className="panel join preview">
          <div className="stack">
            <h2 id="join-h">ככה נראה הגיליון שלכם</h2>
            <p className="muted">גיליון אמיתי של השבוע. בוחרים תחום ורואים מה היה מגיע אליכם ביום ראשון.</p>
            <DigestPreview editions={editions} />
          </div>
          <div className="form">
            <h3>לקבל אותו כל יום ראשון</h3>
            <DigestSubscribe id="home-subscribe" where="home-preview" />
          </div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="faq-h">
        <div className="intro"><h2 id="faq-h">שאלות שכדאי לשאול לפני שנרשמים</h2></div>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="wrap section tight"><SurveyBanner /></section>
    </>
  );
}

function ProfilesHome({ open, tenders }) {
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow"><SparkIcon size={14} /> {STATS.orgs} חברות ו־{STATS.people} אנשים במאגר</span>
          {PROFILES_ENABLED ? (
            <>
              <h1>כל תעשיית הקריאייטיב בישראל. <em>במקום אחד.</em></h1>
              <p className="lead">
                מוצאים לקוחות, סטודיואים ואנשי מקצוע לפי מה שאתם עושים.
                {open && <span className="wide"> ובונים פרופיל מקצועי בדקה, ישר מתוך קורות החיים או מהפורטפוליו.</span>}
              </p>
            </>
          ) : (
            <>
              <h1>מי מזמין מה בתעשיית הקריאייטיב. <em>ומה השתנה השבוע.</em></h1>
              <p className="lead">
                מותגים, משרדי פרסום וסטודיואים לפי מה שהם מזמינים, עם הסיבה לפנות עכשיו. חינם, לפי התחום שלכם.
              </p>
            </>
          )}
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

      {tenders.length > 0 && (
        <section className="wrap tstrip" aria-labelledby="tenders-h">
          <div className="subhead">
            <h2 id="tenders-h">מכרזים פתוחים עכשיו <span className="count">{tenders.length}</span></h2>
            <a href="/tenders">לכל המכרזים ‹</a>
          </div>
          <div className="tgrid">{tenders.slice(0, 3).map((t) => <TenderCard key={t.id} t={t} compact />)}</div>
        </section>
      )}

      <section className="wrap section">
        <div className="intro">
          <h2>{PROFILES_ENABLED ? "מה אפשר לעשות כאן" : "מה מקבלים כאן"}</h2>
        </div>
        <div className="grid fit features">
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

      <section className="wrap section" id="join" aria-labelledby="join-h">
        {PROFILES_ENABLED ? (
          <div className="panel join">
            <div className="stack">
              <h2 id="join-h">{open ? "הצטרפות, והגיליון במייל" : "השבוע בתעשייה"}</h2>
              <p className="muted">
                כל יום ראשון: מינויים בשיווק, החלפות משרד פרסום ומי מזמין את מה שאתם עושים. לפי התחומים שלכם, עם סיבה לפנות.
                {open && " ובאותה הרשמה גם פרופיל מקצועי: ה־AI מכין טיוטה מתוך קורות החיים או הפורטפוליו, ואתם מאשרים."}
              </p>
              <p><a className="tap" href="/digest">לגיליון של השבוע ‹</a></p>
            </div>
            {open && <div className="form"><SignupForm /></div>}
          </div>
        ) : (
          <div className="panel join">
            <div className="stack">
              <h2 id="join-h">השבוע בתעשייה, במייל</h2>
              <p className="muted">
                כל יום ראשון בבוקר: מינויים בשיווק, החלפות משרד, קמפיינים ומי עשה אותם, מכרזים פתוחים, ומי מזמין עכשיו את מה שאתם עושים. לפי התחומים שלכם, חינם.
              </p>
              <p><a className="tap" href="/digest">לגיליון של השבוע ‹</a></p>
            </div>
            <div className="form"><DigestSubscribe id="home-subscribe" /></div>
          </div>
        )}
      </section>
    </>
  );
}
