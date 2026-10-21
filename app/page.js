import SignupForm from "@/components/SignupForm";
import DigestSubscribe from "@/components/DigestSubscribe";
import AuthNotice from "@/components/AuthNotice";
import { PeopleIcon, BuildingIcon, BellIcon, CraftIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { STATS, companiesWithCraft } from "@/lib/companies";
import { supabaseConfig, PROFILES_ENABLED } from "@/lib/config";
import TenderCard from "@/components/TenderCard";
import { listTenders } from "@/lib/tenders";
import { composeDigest, siteUrl } from "@/lib/digest";
import Bidi from "@/components/Bidi";
import { liveProof } from "@/lib/proof";
import "./tenders/tenders.css";
import "./sell.css";

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

// Eight crafts on the home page, named exactly as everywhere else on the site (schema/taxonomy.json).
const CRAFTS = ["motion-design", "animation-3d", "vfx", "branding", "sound-design", "editing", "illustration", "ai-creative"];

// Three questions people ask before signing up. The rest is answered on /join.
const FAQ = [
  ["זה באמת בחינם?", "כן. המייל השבועי, החיפוש, המכרזים וההתראות בחינם. אין כרטיס אשראי ואין תקופת ניסיון."],
  ["מאיפה המידע?", "מפרסומים פומביים: אתרי החברות, ICE, גלובס, CTech, Geektime, משרות בלינקדאין ואתר מנהל הרכש הממשלתי. ליד כל פרט מופיע המקור שלו."],
  ["כמה מיילים, ואיך מסירים?", "עד מייל אחד בשבוע, ביום ראשון בבוקר (אפשר גם כל שבועיים או פעם בחודש). בכל מייל יש קישור להסרה בלחיצה אחת. את הכתובת לא מוכרים ולא משתפים."],
];

export default function Home() {
  if (PROFILES_ENABLED) return <ClassicHome />;
  const tenders = listTenders();
  const now = new Date();
  const proof = liveProof(now);
  // This week's updates: the same items the digest leads with.
  const week = composeDigest({ maxItems: 3, now });
  const updates = [...week.items, ...week.more].slice(0, 3);
  const rel = (u) => String(u || "").replace(siteUrl(), "");
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero sell">
          <span className="eyebrow">
            {proof.updates} עדכונים בשבועיים האחרונים{proof.openTenders ? ` · ${proof.openTenders} מכרזים פתוחים` : ""} · {STATS.orgs} חברות
          </span>
          <h1>לא צריך להכיר את כולם. <em>צריך לדעת מי מזמין, ומתי לפנות.</em></h1>
          <p className="lead">
            כל יום ראשון במייל: מי מונה לשיווק, מי החליף משרד, אילו מכרזים נפתחו ומי מזמין את מה שאתם עושים. לפי התחום שלכם. חינם.
          </p>
          <div className="row">
            <a className="btn primary lg" href="/join" data-track="hero_join">שלחו לי את המייל של יום ראשון</a>
          </div>
          <p className="small muted herohint">חצי דקה. עד מייל אחד בשבוע, הסרה בלחיצה.</p>
        </div>
      </section>

      <section className="wrap section tight crafts-sec" aria-labelledby="crafts-h">
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

      {updates.length > 0 && (
        <section className="wrap section reveal" aria-labelledby="week-h">
          <div className="sechead">
            <div>
              <h2 id="week-h">השבוע בתעשייה</h2>
              <p>מה נכנס למייל של יום ראשון. כל פרט עם מקור.</p>
            </div>
            <a className="btn" href="/digest" data-track="digest_full_open">לכל העדכונים</a>
          </div>
          <ol className="ugrid swipe">
            {updates.map((i) => (
              <li key={i.id} className="ucard">
                <p className="umeta"><b>{i.label}</b> · {i.day}</p>
                <p className="uhead"><Bidi>{i.headline}</Bidi></p>
                {i.why && <p className="uwhy"><Bidi>{i.why}</Bidi></p>}
                {i.org?.name && (
                  <p className="uorg">{i.org.href ? <a className="tap" href={rel(i.org.href)} data-track="proof_item_open"><bdi>{i.org.name}</bdi></a> : <bdi>{i.org.name}</bdi>}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {tenders.length > 0 && (
        <section className="wrap section tstrip reveal" aria-labelledby="tenders-h">
          <div className="sechead">
            <h2 id="tenders-h">מכרזים פתוחים <span className="count">{tenders.length}</span></h2>
            <a className="btn" href="/tenders" data-track="tender_open">לכל המכרזים</a>
          </div>
          <div className="tgrid swipe">{tenders.slice(0, 3).map((t) => <TenderCard key={t.id} t={t} compact />)}</div>
        </section>
      )}

      <section className="wrap section reveal" aria-labelledby="faq-h">
        <div className="sechead"><h2 id="faq-h">לפני שנרשמים</h2></div>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="close-h">
        <div className="panel inverse closer">
          <h2 id="close-h">מה שהשתנה השבוע בתחום שלכם, ביום ראשון במייל.</h2>
          <a className="btn inv lg" href="/join" data-track="closer_join">להרשמה למייל השבועי</a>
        </div>
      </section>
    </>
  );
}

function ClassicHome() {
  const open = Boolean(supabaseConfig());
  const tenders = listTenders();
  // This week's updates: the same items the digest leads with.
  const week = composeDigest({ maxItems: 3 });
  const updates = [...week.items, ...week.more].slice(0, 3);
  const rel = (u) => String(u || "").replace(siteUrl(), "");
  return (
    <>
      <div className="wrap"><AuthNotice /></div>

      <section className="wrap">
        <div className="hero">
          <span className="eyebrow">תעשיית הקריאייטיב בישראל · {STATS.orgs} חברות · {STATS.people} אנשים</span>
          {PROFILES_ENABLED
            ? <h1>כל תעשיית הקריאייטיב. <em>במקום אחד.</em></h1>
            : <h1>מי מזמין מה. <em>ומה השתנה השבוע.</em></h1>}
          {PROFILES_ENABLED ? (
            <p className="lead">
              מוצאים לקוחות, סטודיואים ואנשי מקצוע לפי מה שאתם עושים.
              {open && <span className="wide"> ובונים פרופיל מקצועי בדקה, ישר מתוך קורות החיים או מהפורטפוליו.</span>}
            </p>
          ) : (
            <p className="lead">
              מותגים, משרדי פרסום וסטודיואים: מה כל אחד מזמין, ולמה לפנות דווקא עכשיו.
            </p>
          )}
          <div className="row">
            <a className="btn primary lg" href="#join">להרשמה למייל השבועי</a>
            <a className="btn lg" href="/companies">לכל החברות</a>
          </div>
        </div>
      </section>

      {updates.length > 0 && (
        <section className="wrap section reveal" aria-labelledby="week-h">
          <div className="sechead">
            <h2 id="week-h">השבוע בתעשייה</h2>
            <a className="btn" href="/digest">לכל העדכונים</a>
          </div>
          <ol className="ugrid">
            {updates.map((i) => (
              <li key={i.id} className="ucard">
                <p className="umeta"><b>{i.label}</b> · {i.day}</p>
                <p className="uhead"><Bidi>{i.headline}</Bidi></p>
                {i.why && <p className="uwhy"><Bidi>{i.why}</Bidi></p>}
                {i.org?.name && (
                  <p className="uorg">{i.org.href ? <a className="tap" href={rel(i.org.href)}><bdi>{i.org.name}</bdi></a> : <bdi>{i.org.name}</bdi>}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

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
          <h2 id="what-h">{PROFILES_ENABLED ? "מה אפשר לעשות כאן" : "מה יש כאן"}</h2>
        </div>
        <div className="rows">
          <a className="feature" href="/companies">
            <div className="ico"><BuildingIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "למצוא לקוחות" : "מי מזמין מה"}</h3>
              <p className="muted">מותגים ומשרדי פרסום: מה הם מזמינים, ודרך איזה משרד.</p>
            </div>
          </a>
          <a className="feature" href="/people">
            <div className="ico"><PeopleIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "למצוא שותפים" : "מי מחליט"}</h3>
              <p className="muted">{PROFILES_ENABLED ? "אנשי מקצוע וסטודיואים לפי תחום ועיר, לפרויקט הבא או לגיוס." : "מנהלי שיווק, הפקה וקריאייטיב. מפרסומים פומביים, עם מקור."}</p>
            </div>
          </a>
          <a className="feature" href="/companies#signals">
            <div className="ico"><BellIcon size={22} /></div>
            <div>
              <h3>{PROFILES_ENABLED ? "לדעת לפני כולם" : "מה השתנה"}</h3>
              <p className="muted">גיוסים, החלפות משרד ומינויים. כל עדכון עם הסיבה לפנות.</p>
            </div>
          </a>
        </div>
      </section>

      <section className="wrap section reveal" id="join" aria-labelledby="join-h">
        {PROFILES_ENABLED ? (
          <div className="panel inverse join">
            <div className="stack">
              <h2 id="join-h">{open ? "הצטרפות, והמייל השבועי" : "השבוע בתעשייה"}</h2>
              <p className="muted">
                כל יום ראשון: מינויים בשיווק, החלפות משרד פרסום ומי מזמין את מה שאתם עושים. לפי התחומים שלכם, עם סיבה לפנות.
                {open && " ובאותה הרשמה גם פרופיל מקצועי: ה־AI מכין טיוטה מתוך קורות החיים או הפורטפוליו, ואתם מאשרים."}
              </p>
              <p><a className="btn inv" href="/digest">לעדכוני השבוע</a></p>
            </div>
            {open && <div className="form"><SignupForm /></div>}
          </div>
        ) : (
          <div className="panel inverse join">
            <div className="stack">
              <h2 id="join-h">השבוע בתעשייה, במייל</h2>
              <p className="muted">
                כל יום ראשון בבוקר: מינויים, החלפות משרד, קמפיינים ומכרזים, ומי מזמין עכשיו את מה שאתם עושים. לפי התחומים שלכם, חינם.
              </p>
              <p><a className="btn inv" href="/digest">לעדכוני השבוע</a></p>
            </div>
            <div className="form"><DigestSubscribe id="home-subscribe" /></div>
          </div>
        )}
      </section>
    </>
  );
}
