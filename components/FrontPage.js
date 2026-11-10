import Chevron from "@/components/Chevron";
import KindTag from "@/components/KindTag";
import Bidi from "@/components/Bidi";
import DigestSubscribe from "@/components/DigestSubscribe";
import AuthNotice from "@/components/AuthNotice";
import { WHY_HE } from "@/lib/digest";
import Cover, { Thumb } from "@/components/Cover";
import TrackButton from "@/components/TrackButton";
import { GuestOnly } from "@/components/useJoined";
import "@/app/front.css";

// The home page. First it says what the site is and what you get (three things, with real counts), then one
// numbered section for each of them: what happened (updates), opportunities (open tenders, published jobs),
// and the companies. One call to action: the weekly email. `f` comes from composeFront; it is personal when
// the reader is signed in with crafts or tracked companies. The by-topic view lives on /updates.

const plural = (n, one, many) => (n === 1 ? one : many.replace("%", String(n)));

function Marks({ i }) {
  if (!i.mine && !i.tracked) return null;
  return <>{i.tracked && <span className="fp-mark">במעקב שלכם</span>}{i.mine && !i.tracked && <span className="fp-mark">בתחום שלכם</span>}</>;
}

function Story({ i, where }) {
  return (
    <li className="fp-story">
      <a className="fp-thumb" href={i.href} tabIndex={-1} aria-hidden="true" data-track="update_open" data-track-where={where}><Thumb i={i} /></a>
      <div className="fp-story-body">
        <p className="fp-kicker"><span>{i.beat_he || i.label}</span> · <span>{i.day}</span><Marks i={i} /></p>
        <a className="fp-head" href={i.href} data-track="update_open" data-track-where={where}><Bidi>{i.title}</Bidi></a>
        {i.org?.name && <p className="fp-org"><bdi>{i.org.name}</bdi>{i.org.kind && <KindTag kind={i.org.kind} />}</p>}
      </div>
    </li>
  );
}

// Signed in: where they stand (the weekly email, their crafts, what they track) and one next step.
function Member({ m, who }) {
  const step = !who ? "crafts" : m.suggest.length ? "follow" : "";
  return (
    <section className="fp-member" aria-labelledby="member-h">
      <div className="fp-member-text">
        <h1 id="member-h">{who ? "שלום. זה מה שחדש בתחומים שלכם." : "שלום. זה מה שחדש בתעשייה."}</h1>
        <ul className="fp-status">
          <li><span className="muted">המייל השבועי</span><b>{m.newsletter ? (m.next ? `הבא: ${m.next}` : "פעיל") : "כבוי"}</b><a href="/digest/settings">{m.newsletter ? "להגדרות" : "להפעלה"}</a></li>
          <li><span className="muted">התחומים שלכם</span><b>{who || "עוד לא נבחרו"}</b><a href="/digest/settings">{who ? "לשינוי" : "לבחירה"}</a></li>
          <li><span className="muted">במעקב</span><b>{plural(m.follows, "חברה אחת", "% חברות")}</b><a href="/me">לרשימה</a></li>
        </ul>
      </div>
      {step === "crafts" && (
        <div className="fp-next">
          <p className="fp-next-k">השלב הבא</p>
          <h2>בחרו את התחומים שלכם</h2>
          <p className="muted">ככה הדף והמייל השבועי יציגו קודם את מה שרלוונטי לעבודה שלכם.</p>
          <p><a className="btn primary" href="/digest/settings">לבחירת תחומים</a></p>
        </div>
      )}
      {step === "follow" && (
        <div className="fp-next">
          <p className="fp-next-k">השלב הבא · {m.follows} מתוך {m.goal}</p>
          <h2>עקבו אחרי חברות שמעניינות אתכם</h2>
          <p className="muted">כשמשהו משתנה אצלן, זה יופיע כאן ראשון ובמייל. אלה מזמינות עבודה בתחומים שלכם.</p>
          <ul className="fp-suggest">
            {m.suggest.map((o) => (
              <li key={o.id}>
                <a href={`/companies/${encodeURIComponent(o.id)}`} className="fp-suggest-name" data-track="company_open" data-track-where="home_next">
                  <Thumb i={{ org: { ...o, logo: o.logo } }} size={44} />
                  <span><b><bdi>{o.name}</bdi></b>{o.reason && <span className="muted small"><Bidi>{o.reason}</Bidi></span>}</span>
                </a>
                <TrackButton orgId={o.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SecHead({ n, id, title, text, href, more }) {
  return (
    <div className="fp-sechead">
      <div>
        <h2 id={id}>{n && <span className="fp-n" aria-hidden="true">{n}</span>}{title}</h2>
        <p className="muted">{text}</p>
      </div>
      {href && <a className="btn" href={href}>{more}</a>}
    </div>
  );
}

export default function FrontPage({ f, signedIn = false, member = null }) {
  const { lead, tracked, top, tenders, jobs, inTheNews, stats } = f;
  const who = f.crafts.map((c) => c.he).slice(0, 3).join(", ");
  const live = stats.openTenders + stats.upcomingTenders;
  const news = top.slice(0, 4);

  return (
    <div className="wrap fp">
      <AuthNotice />
      {signedIn && !member && <h1 className="sr-only">CreativeIn: מה קורה בתעשיית הקריאייטיב בישראל</h1>}

      {signedIn ? (
        member ? <Member m={member} who={who} /> : (
          <p className="fp-personal">
            {who ? <>הדף מותאם לתחומים שלכם: <b>{who}</b>. </> : "בחרו תחומים, והדף והמייל השבועי יותאמו אליהם. "}
            <a href="/digest/settings">{who ? "לשינוי התחומים" : "לבחירת תחומים"}</a>
          </p>
        )
      ) : (
        <section className="fp-intro" aria-labelledby="intro-h">
          <div className="fp-intro-text">
            <h1 id="intro-h">כל מה שקורה בתעשיית הקריאייטיב בישראל, במקום אחד.</h1>
            <p className="fp-intro-lead">כל שבוע אנחנו אוספים מה קרה: קמפיינים ומי עשה אותם, מינויים, עסקאות, מכרזים ומשרות. הכול עם מקור, ובמייל אחד ביום ראשון.</p>
            <GuestOnly
              pending={<p className="fp-intro-back">שלחנו לכם קישור אישור במייל. לחצו עליו כדי לסיים את ההרשמה. לא הגיע? בדקו בספאם.</p>}
              joined={<p className="fp-intro-back">כבר נרשמתם. <a href="/me">היכנסו</a>, והדף יותאם לתחומים שלכם ולחברות שאתם עוקבים אחריהן.</p>}
            >
              <p className="fp-intro-cta">
                <a className="btn primary lg" href="/join" data-track="front_join">להרשמה למייל השבועי</a>
                <span className="muted small">חינם. לפי התחום שלכם.</span>
              </p>
            </GuestOnly>
          </div>
          <ol className="fp-get" aria-label="מה יש כאן">
            <li><a className="fp-get-a" href="#news-h"><span className="fp-n">01</span><b>עדכונים</b><span className="muted">{plural(stats.month, "עדכון אחד בחודש האחרון", "% עדכונים בחודש האחרון")}</span></a></li>
            <li><a className="fp-get-a" href="#opp-h"><span className="fp-n">02</span><b>הזדמנויות</b><span className="muted">{live > 0 ? plural(live, "מכרז אחד", "% מכרזים") : "מכרזים"} ו{plural(stats.jobs, "משרה אחת", "־% משרות")}</span></a></li>
            <li><a className="fp-get-a" href="#companies-h"><span className="fp-n">03</span><b>חברות</b><span className="muted">{stats.orgs} חברות, ומי עובד עם מי</span></a></li>
          </ol>
        </section>
      )}

      {tracked.length > 0 && (
        <section className="fp-sec" aria-labelledby="tracked-h">
          <SecHead id="tracked-h" title="במעקב שלכם" text="מה השתנה בחברות שאתם עוקבים אחריהן." href="/me" more="לרשימת המעקב" />
          <ol className="fp-list fp-cols">{tracked.map((i) => <Story key={i.id} i={i} where="home_tracked" />)}</ol>
        </section>
      )}

      {lead && (
        <section className="fp-sec" aria-labelledby="news-h">
          <SecHead id="news-h" n="01" title="מה קרה בתעשייה" text="הסיפורים החשובים מהשבועות האחרונים: קמפיינים, מינויים, עסקאות והשקות." href="/updates" more="לכל העדכונים" />
          <div className="fp-news">
            <article className="fp-leadstory">
              <a className="fp-cover" href={lead.href} tabIndex={-1} aria-hidden="true" data-track="update_open" data-track-where="home_lead_cover"><Cover i={lead} priority /></a>
              <p className="fp-kicker"><span>{lead.beat_he || lead.label} · {lead.day}</span><Marks i={lead} /></p>
              <h3 className={lead.title.length > 60 ? "long" : undefined}><a href={lead.href} data-track="update_open" data-track-where="home_lead"><Bidi>{lead.title}</Bidi></a></h3>
              {lead.why && <p className="fp-why"><b>{WHY_HE}:</b> <Bidi>{lead.why}</Bidi></p>}
            </article>
            {news.length > 0 && <ol className="fp-list fp-side">{news.map((i) => <Story key={i.id} i={i} where="home_top" />)}</ol>}
          </div>
        </section>
      )}

      {(tenders.length > 0 || jobs.length > 0) && (
        <section className="fp-sec" aria-labelledby="opp-h">
          <SecHead id="opp-h" n="02" title="הזדמנויות" text={`מכרזים פתוחים ומשרות שפורסמו${who ? " בתחומים שלכם" : ""}. מגישים דרך המקור.`} />
          <div className="fp-opp">
            {tenders.length > 0 && (
              <div className="fp-box">
                <h3>מכרזים</h3>
                <div className="fp-tenders">
                  {tenders.map((t) => (
                    <a key={t.id} className="fp-tender" href={t.url} target="_blank" rel="noopener noreferrer" data-track="tender_source_click">
                      <span className="fp-tender-text"><b><Bidi>{t.summary}</Bidi></b><span className="muted small">{t.buyer} · <bdi>{t.when}</bdi></span></span>
                      <span className={`fp-state${t.state === "open" ? " open" : ""}${t.urgent ? " urgent" : ""}`}>{t.label}</span>
                    </a>
                  ))}
                </div>
                <a className="fp-more" href="/tenders">לכל המכרזים <Chevron /></a>
              </div>
            )}
            {jobs.length > 0 && (
              <div className="fp-box">
                <h3>משרות</h3>
                <ul className="fp-jobs">
                  {jobs.slice(0, 4).map((j) => (
                    <li key={j.id}>
                      <a href={j.href} data-track="update_open" data-track-where="home_jobs">
                        <Thumb i={j} size={44} />
                        <span className="fp-job-text">
                          <span className="fp-job-org">{j.org?.name ? <bdi>{j.org.name}</bdi> : "משרה"}</span>
                          <span className="fp-job-head"><Bidi>{j.title.replace(/^משרה פתוחה ב[־\-]?[^:]{0,60}:\s*/, "")}</Bidi></span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <a className="fp-more" href="/updates?beat=jobs">לכל המשרות <Chevron /></a>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="fp-sec" aria-labelledby="companies-h">
        <SecHead id="companies-h" n="03" title="החברות" text={`${stats.orgs} מותגים, משרדי פרסום, סטודיואים והפקות: מה כל אחת עושה, ומי עובד עם מי. אלה היו בחדשות לאחרונה.`} href="/companies" more={`לכל ${stats.orgs} החברות`} />
        {inTheNews.length > 0 && (
          <div className="fp-chips">
            {inTheNews.map((o) => (
              <a key={o.id} className="fp-chip" href={o.href} data-track="company_open" data-track-where="home_inthenews">
                <Thumb i={{ org: o }} size={48} />
                <b><bdi>{o.name}</bdi></b>
                <KindTag kind={o.kind} />
              </a>
            ))}
          </div>
        )}
      </section>

      {!signedIn && (
        <GuestOnly>
          <section className="panel inverse fp-cta" aria-labelledby="cta-h">
            <div className="fp-cta-text">
              <h2 id="cta-h">כל זה, במייל אחד ביום ראשון.</h2>
              <p className="muted">העדכונים בתחומים שלכם, המכרזים שנפתחים והחברות שאתם עוקבים אחריהן. לא צריך להכיר את כולם. מספיק להישאר In.</p>
            </div>
            <div className="fp-cta-form"><DigestSubscribe compact where="home-front" crafts={f.crafts.map((c) => c.slug)} /></div>
          </section>
        </GuestOnly>
      )}
    </div>
  );
}
