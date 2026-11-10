import Chevron from "@/components/Chevron";
import KindTag from "@/components/KindTag";
import Bidi from "@/components/Bidi";
import DigestSubscribe from "@/components/DigestSubscribe";
import AuthNotice from "@/components/AuthNotice";
import { LinkIcon } from "@/components/Icons";
import { WHY_HE } from "@/lib/digest";
import Cover, { Thumb } from "@/components/Cover";
import "@/app/front.css";

// The home page as a news front: the story of the week, the next stories, opportunities, the rest by
// section, who's in the news, and one call to action (the weekly email). `f` comes from composeFront; it is
// personal when the reader is signed in with crafts or tracked companies.

const plural = (n, one, many) => (n === 1 ? one : many.replace("%", String(n)));

function OrgLink({ org, where }) {
  if (!org) return null;
  if (!org.href) return <bdi>{org.name}</bdi>;
  return <a href={org.href} data-track="company_open" data-track-where={where}><bdi>{org.name}</bdi></a>;
}

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
        {i.org?.name && <p className="fp-org"><OrgLink org={i.org} where={where} />{i.org.kind && <KindTag kind={i.org.kind} />}</p>}
      </div>
    </li>
  );
}

export default function FrontPage({ f, signedIn = false }) {
  const { lead, tracked, top, beats, tenders, jobs, inTheNews, stats } = f;
  const who = f.crafts.map((c) => c.he).slice(0, 3).join(", ");
  const opportunities = tenders.length + jobs.length;

  return (
    <div className="wrap fp">
      <AuthNotice />

      <div className="fp-dateline">
        <p><b>{f.dateline}</b> · מה קרה השבוע בתעשיית הקריאייטיב בישראל.</p>
        <p className="fp-counts">
          <a href="/companies">{stats.orgs} חברות במדריך</a>
          {stats.week > 0 && <> · <a href="/updates">{plural(stats.week, "עדכון אחד נוסף השבוע", "% עדכונים נוספו השבוע")}</a></>}
          {stats.openTenders + stats.upcomingTenders > 0 && <> · <a href="/tenders">{plural(stats.openTenders + stats.upcomingTenders, "מכרז אחד פתוח או בקרוב", "% מכרזים פתוחים או בקרוב")}</a></>}
        </p>
      </div>

      {signedIn && (
        <p className="fp-personal">
          {who ? <>הדף מותאם לתחומים שלכם: <b>{who}</b>. </> : "בחרו תחומים, והדף והמייל השבועי יותאמו אליהם. "}
          <a href="/digest/settings">{who ? "לשינוי התחומים" : "לבחירת תחומים"}</a>
        </p>
      )}

      {lead && (
        <section className="fp-lead" aria-labelledby="lead-h">
          <article className="fp-leadstory">
            <a className="fp-cover" href={lead.href} tabIndex={-1} data-track="update_open" data-track-where="home_lead_cover"><Cover i={lead} priority /></a>
            <p className="fp-kicker"><span className="fp-badge">הסיפור של השבוע</span><span>{lead.beat_he || lead.label} · {lead.day}</span><Marks i={lead} /></p>
            <h1 id="lead-h" className={lead.title.length > 60 ? "long" : undefined}><a href={lead.href} data-track="update_open" data-track-where="home_lead"><Bidi>{lead.title}</Bidi></a></h1>
            {lead.why && <p className="fp-why"><b>{WHY_HE}:</b> <Bidi>{lead.why}</Bidi></p>}
            {(lead.credits.length > 0 || lead.org) && (
              <div className="fp-credits">
                {lead.org && (
                  <div className="fp-credit">
                    <span className="fp-role">{lead.org.kind === "client" ? "המותג" : "החברה"}</span>
                    <span className="fp-who"><OrgLink org={lead.org} where="home_lead" /></span>
                    {lead.org.kind && <KindTag kind={lead.org.kind} />}
                  </div>
                )}
                {lead.credits.map((c) => (
                  <div key={c.role + c.who} className="fp-credit">
                    <span className="fp-role">{c.role_he}</span>
                    <span className="fp-who">{c.org ? <OrgLink org={c.org} where="home_lead" /> : <bdi>{c.who}</bdi>}</span>
                    {c.org?.kind && <KindTag kind={c.org.kind} />}
                  </div>
                ))}
              </div>
            )}
            <p className="fp-actions">
              <a className="btn" href={lead.href} data-track="update_open" data-track-where="home_lead_btn">לעדכון המלא</a>
              {lead.source_url && <span className="muted small">מקור: <a href={lead.source_url} target="_blank" rel="noopener noreferrer" data-track="opportunity_source_click" data-track-category={lead.type} data-track-where="home_lead"><bdi>{lead.source || "מקור"}</bdi> <LinkIcon size={12} /></a></span>}
            </p>
          </article>

          <aside className="fp-top" aria-labelledby="top-h">
            {tracked.length > 0 && (
              <>
                <h2 id="tracked-h" className="fp-aside-h">במעקב שלכם</h2>
                <ol className="fp-list">{tracked.map((i) => <Story key={i.id} i={i} where="home_tracked" />)}</ol>
              </>
            )}
            <h2 id="top-h" className="fp-aside-h">עוד השבוע</h2>
            <ol className="fp-list">{top.map((i) => <Story key={i.id} i={i} where="home_top" />)}</ol>
            {!signedIn && <p className="fp-join small"><a href="/join" data-track="front_join">נרשמים, ורואים את הדף לפי התחומים שלכם <Chevron /></a></p>}
          </aside>
        </section>
      )}

      {opportunities > 0 && (
        <section className="fp-sec" aria-labelledby="opp-h">
          <div className="fp-sechead">
            <h2 id="opp-h">הזדמנויות</h2>
            <p className="muted">רק מכרזים פתוחים ומשרות שפורסמו, עם מקור{who ? `, בתחומים שלכם` : ""}.</p>
          </div>
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
                <h3>משרות שפורסמו</h3>
                <ul className="fp-jobs">
                  {jobs.map((j) => (
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

      {beats.length > 0 && (
        <section className="fp-sec" aria-label="לפי נושא">
          <div className="fp-beats">
            {beats.map((b) => (
              <div key={b.key} className="fp-beat">
                <h2><a href={`/updates?beat=${b.key}`}>{b.he}</a></h2>
                <ol className="fp-list">{b.items.map((i) => <Story key={i.id} i={i} where={`home_${b.key}`} />)}</ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {inTheNews.length > 0 && (
        <section className="fp-sec" aria-labelledby="news-h">
          <div className="fp-sechead">
            <h2 id="news-h">חברות בחדשות</h2>
            <a className="btn" href="/companies">לכל {stats.orgs} החברות</a>
          </div>
          <div className="fp-chips">
            {inTheNews.map((o) => (
              <a key={o.id} className="fp-chip" href={o.href} data-track="company_open" data-track-where="home_inthenews">
                <Thumb i={{ org: o }} size={48} />
                <b><bdi>{o.name}</bdi></b>
                <KindTag kind={o.kind} />
                <span className="muted small">{plural(o.updates, "עדכון אחד", "% עדכונים")}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="panel inverse fp-cta" aria-labelledby="cta-h">
        <div className="fp-cta-text">
          <h2 id="cta-h">כל זה, במייל אחד ביום ראשון.</h2>
          <p className="muted">העדכונים בתחומים שלכם, המכרזים שנפתחים והחברות שאתם עוקבים אחריהן. לא צריך להכיר את כולם. מספיק להישאר In.</p>
        </div>
        <div className="fp-cta-form">
          {signedIn
            ? <p><a className="btn" href="/digest/settings">הגדרות המייל השבועי</a> <a className="btn" href="/me">האזור האישי</a></p>
            : <DigestSubscribe compact where="home-front" crafts={f.crafts.map((c) => c.slug)} />}
        </div>
      </section>
    </div>
  );
}
