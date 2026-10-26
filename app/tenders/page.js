import "./tenders.css";
import TenderCard from "@/components/TenderCard";
import AutoSelect from "@/components/AutoSelect";
import { SearchIcon } from "@/components/Icons";
import { craftLabel } from "@/lib/taxonomy";
import { craftOfQuery } from "@/lib/match";
import { listTenders, craftsInTenders, buyerTypesInTenders, BUYER_TYPE_HE } from "@/lib/tenders";
import { composeDigest, siteUrl } from "@/lib/digest";
import Bidi from "@/components/Bidi";

// Deadlines count down, so the page is rebuilt every hour rather than once per deploy.
export const revalidate = 3600;

export const metadata = {
  title: "מכרזים פתוחים",
  description: "מכרזים לעבודות קריאייטיב: הפקה, וידאו, עיצוב, אירועים וקמפיינים. משרדי ממשלה, עיריות וגופים ציבוריים, עם מועד ההגשה וקישור למקור הרשמי.",
  alternates: { canonical: "/tenders" },
  openGraph: { title: "מכרזים לעבודות קריאייטיב · CreativeIn", description: "מכרזים ממשלתיים וציבוריים לעבודות קריאייטיב, לפי מועד ההגשה, עם קישור למקור הרשמי.", siteName: "CreativeIn", locale: "he_IL", type: "website", images: [{ url: "/og/site.png", width: 1200, height: 630 }] },
};

export default async function Tenders({ searchParams }) {
  const sp = await searchParams;
  const typed = String(sp?.q || "").slice(0, 80).trim();
  const crafts = craftsInTenders();
  const asked = crafts.includes(sp?.craft) ? sp.craft : "";
  const named = asked ? "" : craftOfQuery(typed);
  const craft = asked || named;
  const q = named ? "" : typed;
  const types = buyerTypesInTenders();
  const buyerType = types.includes(sp?.buyer) ? sp.buyer : "";
  const now = new Date();

  const all = listTenders({ craft, buyerType, q, closed: true, now });
  // Published job posts (hiring updates with a source) from the last 45 days, newest first.
  const jobs = composeDigest({ topics: ["jobs"], days: 45, maxItems: 30, now }).items.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const rel = (u) => String(u || "").replace(siteUrl(), "");
  const open = all.filter((t) => t.state === "open");
  const upcoming = all.filter((t) => t.state === "upcoming");
  const closed = all.filter((t) => t.state === "closed" || t.state === "cancelled");
  const href = (over) => {
    const p = { ...(q ? { q } : {}), ...(craft ? { craft } : {}), ...(buyerType ? { buyer: buyerType } : {}), ...over };
    Object.keys(p).forEach((k) => !p[k] && delete p[k]);
    const s = new URLSearchParams(p).toString();
    return s ? `/tenders?${s}` : "/tenders";
  };
  const filtered = Boolean(q || craft || buyerType);

  return (
    <div className="wrap">
      <div className="pagehead list">
        <h1>מכרזים פתוחים <span className="cbox">{open.length}</span></h1>
        <p>עבודה שאפשר להגיש עליה הצעה עכשיו: <b>הפקה, וידאו, עיצוב, אירועים וקמפיינים</b>, ממשרדי ממשלה, עיריות וגופים ציבוריים. לפי מועד ההגשה, עם קישור למקור.</p>
        <p><a className="btn soft" href="/digest#subscribe" data-track="tender_digest_cta">מכרזים חדשים במייל, כל יום ראשון ‹</a></p>
      </div>

      <form className="toolbar" role="search" action="/tenders">
        <div className="psearch">
          <input type="search" name="q" defaultValue={q} placeholder="נושא או גוף מזמין" aria-label="חיפוש במכרזים" />
          <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
        </div>
        <AutoSelect name="craft" defaultValue={craft} aria-label="תחום">
          <option value="">כל התחומים</option>
          {crafts.map((c) => <option key={c} value={c}>{craftLabel(c)}</option>)}
        </AutoSelect>
        {buyerType && <input type="hidden" name="buyer" value={buyerType} />}
      </form>
      {types.length > 1 && (
        <nav className="popular" aria-label="סינון לפי גוף מזמין">
          <a className={`tag${buyerType ? "" : " on"}`} href={href({ buyer: "" })} aria-current={buyerType ? undefined : "true"}>כל המזמינים</a>
          {types.map((b) => (
            <a key={b} className={`tag${buyerType === b ? " on" : ""}`} href={href({ buyer: b })} aria-current={buyerType === b ? "true" : undefined}>{BUYER_TYPE_HE[b] || b}</a>
          ))}
        </nav>
      )}

      <section aria-labelledby="open-h">
        <div className="subhead">
          <h2 id="open-h">פתוחים להגשה{open.length > 0 && <> <span className="count">{open.length}</span></>}</h2>
          {open.length > 0 && <p>המידע לפי פרסום רשמי. לפני הגשה, בדקו את מסמכי המכרז במקור.</p>}
        </div>
        {open.length === 0 ? (
          <div className="soon">
            <h3>{filtered ? "אין כרגע מכרז פתוח להגשה שמתאים לחיפוש" : "אין כרגע מכרזים פתוחים להגשה במאגר"}</h3>
            <p>{upcoming.length > 0 ? "יש מכרזים שפורסמו וההגשה אליהם תיפתח בקרוב (למטה). " : ""}מכרזים חדשים נוספים כל שבוע, ומגיעים גם למייל ״השבוע בתעשייה״.</p>
            <div className="row center">
              {filtered && <a className="btn" href="/tenders">לכל המכרזים</a>}
              <a className="btn primary" href="/digest#subscribe">להרשמה למייל השבועי</a>
            </div>
          </div>
        ) : (
          <div className="tgrid">{open.map((t) => <TenderCard key={t.id} t={t} />)}</div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-h">
          <div className="subhead">
            <h2 id="upcoming-h">פורסמו, ההגשה עוד לא נפתחה <span className="count">{upcoming.length}</span></h2>
            <p>המכרז כבר פורסם. קראו את המסמכים והתכוננו. הגשת הצעות נפתחת בתאריך שמופיע בכרטיס.</p>
          </div>
          <div className="tgrid">{upcoming.map((t) => <TenderCard key={t.id} t={t} />)}</div>
        </section>
      )}

      {jobs.length > 0 && (
        <section id="jobs" aria-labelledby="jobs-h">
          <div className="subhead">
            <h2 id="jobs-h">משרות שפורסמו <span className="count">{jobs.length}</span></h2>
            <p>משרות קריאייטיב מ־45 הימים האחרונים, מלינקדאין ומאתרי החברות. בדקו במקור שהמשרה עדיין פתוחה.</p>
          </div>
          <ol className="jobs">
            {jobs.map((j) => (
              <li key={j.id} className={j.source_url ? "jclick" : undefined}>
                {/* The whole row opens the job (a stretched link); the company name stays its own link. */}
                {j.source_url
                  ? <a className="jhead jlink" href={j.source_url} target="_blank" rel="noopener noreferrer" data-track="opportunity_source_click" data-track-category="hiring" data-track-where="jobs"><Bidi>{j.headline}</Bidi></a>
                  : <p className="jhead"><Bidi>{j.headline}</Bidi></p>}
                <p className="jmeta">
                  {j.org?.name && (j.org.href ? <a className="jorg" href={rel(j.org.href)} data-track="company_open" data-track-where="jobs"><bdi>{j.org.name}</bdi></a> : <bdi>{j.org.name}</bdi>)}
                  {j.org?.name ? " · " : ""}{j.day}
                  {j.source_url && <span className="jgo" aria-hidden="true">למשרה ב־<bdi>{String(j.source || "מקור").replace(/\s*jobs$/i, "")}</bdi> ↗</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed-h">
          <div className="subhead">
            <h2 id="closed-h">נסגרו לאחרונה <span className="count">{closed.length}</span></h2>
            <p>כדי לדעת מה מזמינים ומתי. בדרך כלל אותם גופים חוזרים כל שנה.</p>
          </div>
          <div className="tgrid">{closed.map((t) => <TenderCard key={t.id} t={t} />)}</div>
        </section>
      )}

      <div className="panel tnote">
        <h2>מאיפה המכרזים</h2>
        <p>
          ממינהל הרכש הממשלתי, מערכות המכרזים של רשויות מקומיות, חברות ממשלתיות, אוניברסיטאות וגופים ציבוריים.
          אנחנו מביאים את הכותרת, הגוף המזמין ותאריך ההגשה, וקישור לפרסום הרשמי. בלי פרטי אנשי קשר.
        </p>
        <p className="small muted">המידע לפי פרסום רשמי; בדקו את מסמכי המכרז. מועדים משתנים לפעמים, והמקור הוא הקובע.</p>
        <a className="btn primary" href="/digest#subscribe">מכרזים חדשים במייל, כל יום ראשון</a>
      </div>
    </div>
  );
}
