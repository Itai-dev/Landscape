import { composeDigest, craftsTitle, linkedinPost, siteUrl, WHY_HE } from "@/lib/digest";
import { CRAFTS, CRAFT_SLUGS } from "@/lib/taxonomy";
import { isOpen as surveyOpen } from "@/lib/survey/config";
import DigestSubscribe from "@/components/DigestSubscribe";
import CopyPost from "@/components/CopyPost";
import Bidi from "@/components/Bidi";
import { LinkIcon } from "@/components/Icons";
import FollowButton from "@/components/FollowButton";
import "../tenders/tenders.css";

// Crafts shown first in the picker; the rest sit under "עוד תחומים".
const TOP = ["motion-design", "animation-3d", "animation-2d", "vfx", "post-production", "editing", "sound-design", "branding", "illustration", "commercial-production", "content-studio", "ai-creative"];
const WEB_ITEMS = 8; // the web edition shows a little more than the email

const parseCrafts = (v) => String(v || "").split(",").map((s) => s.trim()).filter((s) => CRAFT_SLUGS.includes(s)).slice(0, 8);

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const d = composeDigest({ crafts: parseCrafts(sp?.crafts), maxItems: WEB_ITEMS });
  const who = craftsTitle(d);
  const title = who ? `השבוע בתעשייה: ${who}` : "השבוע בתעשייה";
  const top = [...d.items, ...d.more].slice(0, 2).map((i) => i.headline).join(" · ");
  const description = top || "מי מונה לשיווק, מי החליף משרד ואילו מכרזים נפתחו השבוע בתעשיית הקריאייטיב בישראל. ולמה זה רלוונטי לכם.";
  const url = `${siteUrl()}/digest${d.crafts.length ? `?crafts=${d.crafts.map((c) => c.slug).join(",")}` : ""}`;
  const image = { url: "/og/digest.png", width: 1200, height: 630, alt: "השבוע בתעשייה · CreativeIn" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · CreativeIn`, description, url, type: "article", locale: "he_IL", siteName: "CreativeIn", images: [image] },
    twitter: { card: "summary_large_image", title: `${title} · CreativeIn`, description, images: [image.url] },
  };
}

function Item({ i, span }) {
  return (
    <li className="ditem">
      <div className="dmeta"><span className="dtype">{i.class_label || i.label}</span> · <span>{i.day}</span>{i.late && <span className="muted"> · הגיע אלינו {span}</span>}</div>
      <p className="dhead"><Bidi>{i.headline}</Bidi></p>
      {i.why && <p className="dwhy"><span className="muted">{WHY_HE}: </span><Bidi>{i.why}</Bidi></p>}
      <div className="dfoot">
        {i.org?.href ? <a className="tap" href={i.org.href.replace(siteUrl(), "")}><bdi>{i.org.name}</bdi></a> : i.org?.name ? <bdi>{i.org.name}</bdi> : null}
        {i.source_url && (
          <a className="src tap" href={i.source_url} target="_blank" rel="noopener noreferrer" data-track="opportunity_source_click" data-track-category={i.type || "signal"}>
            <bdi>{i.source || "מקור"}</bdi> <LinkIcon size={14} />
          </a>
        )}
      </div>
    </li>
  );
}

export default async function Digest({ searchParams }) {
  const sp = await searchParams;
  const chosen = parseCrafts(sp?.crafts);
  const d = composeDigest({ crafts: chosen, maxItems: WEB_ITEMS });
  const base = siteUrl();
  const rel = (href) => href.replace(base, "");
  const toggle = (slug) => {
    const next = chosen.includes(slug) ? chosen.filter((c) => c !== slug) : [...chosen, slug];
    return next.length ? `/digest?crafts=${next.join(",")}` : "/digest";
  };
  const who = craftsTitle(d);
  const rest = CRAFTS.filter((c) => !TOP.includes(c.slug));

  return (
    <div className="wrap digest">
      <div className="pagehead">
        <span className="eyebrow">{d.range}</span>
        <h1>השבוע בתעשייה</h1>
        <p>
          {who ? <>מה השתנה השבוע אצל מי שמזמין <b>{who}</b>, ולמה זה יכול להיות רלוונטי.</> : "מי מונה לשיווק, מי החליף משרד, אילו מכרזים פורסמו ואילו משרות נפתחו. כל פרט עם מקור, תאריך ולמה הוא רלוונטי."}
        </p>
      </div>

      <div className="dlayout">
        <aside className="dside" aria-label="הרשמה ושיתוף">
          <div className="panel stack" id="subscribe-panel">
            <h2>לקבל את זה כל יום ראשון</h2>
            <p className="muted">בבוקר, לפני כולם, רק מה ששייך לתחומים שלכם. חינם, ואפשר להסיר בלחיצה.</p>
            <DigestSubscribe crafts={chosen} where="digest-page" />
          </div>
          <div className="card stack share">
            <h3>לשתף</h3>
            <p className="muted small">פוסט מוכן עם העדכונים הבולטים וקישור ל״השבוע בתעשייה״ באתר.</p>
            <CopyPost text={linkedinPost(d, base)} />
          </div>
          {surveyOpen() && (
            <div className="card stack">
              <h3>סקר התעריפים 2026</h3>
              <p className="muted small">4 דקות, ותראו כמה גובים אחרים בתחום שלכם ותוך כמה זמן משלמים להם.</p>
              <a className="btn soft" href="/survey" data-track="survey_start" data-track-label="digest">לענות על הסקר ‹</a>
            </div>
          )}
        </aside>

        <div className="dmain">
          <details className="craft-filter">
            <summary>
              <span>{who ? <>התחומים שלכם: <b>{who}</b></> : "כל התחומים"}</span> <span className="change">שינוי תחומים</span>
            </summary>
            <nav className="popular" aria-label="התאמה לתחומים">
              <a className={`tag${chosen.length ? "" : " on"}`} href="/digest" aria-current={chosen.length ? undefined : "true"}>כל התחומים</a>
              {CRAFTS.filter((c) => TOP.includes(c.slug) || chosen.includes(c.slug)).map((c) => (
                <a key={c.slug} className={`tag${chosen.includes(c.slug) ? " on" : ""}`} href={toggle(c.slug)} aria-current={chosen.includes(c.slug) ? "true" : undefined}>{c.he}</a>
              ))}
              {rest.filter((c) => !chosen.includes(c.slug)).map((c) => <a key={c.slug} className="tag" href={toggle(c.slug)}>{c.he}</a>)}
            </nav>
          </details>

          {d.items.length > 0 ? (
            <section aria-labelledby="d-items">
              <div className="subhead"><h2 id="d-items">{who ? "בתחומים שלכם" : d.period.updates} <span className="count">{d.items.length}</span></h2></div>
              <ol className="dlist">{d.items.map((i) => <Item key={i.id} i={i} span={d.period.span} />)}</ol>
            </section>
          ) : (
            <div className="soon">
              <h3>{who ? `השבוע לא היו עדכונים שעוסקים ב${who}` : "השבוע עוד לא היו עדכונים"}</h3>
              <p>המאגר מתעדכן כל שבוע. בינתיים, הנה מה שכן קרה, ומי מזמין את התחומים האלה.</p>
            </div>
          )}

          {d.tenders.length > 0 && (
            <section aria-labelledby="d-tenders">
              <div className="subhead">
                <h2 id="d-tenders">{who ? `מכרזים ב${who}` : "מכרזים"} <span className="count">{d.tenders.length}</span></h2>
                <a className="tap" href={`/tenders${chosen.length === 1 ? `?craft=${chosen[0]}` : ""}`}>לכל המכרזים ‹</a>
              </div>
              <div className="tresults">
                {d.tenders.map((t) => (
                  <a key={t.id} className="trow" href={t.url} target="_blank" rel="noopener noreferrer" data-track="tender_source_click">
                    <span className="muted small">{t.label}</span>
                    <b>{t.summary}</b>
                    <span>{t.buyer} · {t.state === "open" ? `${t.countdown} · ` : ""}<bdi>{t.when}</bdi> · למכרז במקור הרשמי</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {d.more.length > 0 && (
            <section aria-labelledby="d-more">
              <div className="subhead"><h2 id="d-more">עוד בתעשייה</h2></div>
              <ol className="dlist">{d.more.map((i) => <Item key={i.id} i={i} span={d.period.span} />)}</ol>
            </section>
          )}

          {d.picks.length > 0 && (
            <section aria-labelledby="d-picks">
              <div className="subhead">
                <h2 id="d-picks">{who ? `מי מזמין ${who}` : "מותגים ומשרדים עם חדשות"}</h2>
                <p>{who ? "לפי מה שידוע שהם מזמינים, ועם עדכון אחרון אם יש" : "עם העדכון האחרון על כל אחד"}</p>
              </div>
              <ul className="dpicks">
                {d.picks.map((p) => (
                  <li key={p.org.id}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap" }}>
                      <a className="pname tap" href={rel(p.org.href)}><bdi>{p.org.name}</bdi></a>
                      {p.org.id && <FollowButton orgId={p.org.id} orgName={p.org.name} compact />}
                    </div>
                    {p.craft && <span className="tag soft">{p.craft}</span>}
                    <p><Bidi>{p.reason}</Bidi></p>
                    {p.detail && <p className="muted small"><Bidi>{p.detail}</Bidi></p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.added.total > 0 && (
            <section aria-labelledby="d-new">
              <div className="subhead"><h2 id="d-new">נוספו למאגר</h2></div>
              {d.added.list.length ? (
                <div className="popular start">
                  {d.added.list.map((o) => <a key={o.id} className="tag" href={rel(o.href)}><bdi>{o.name}</bdi></a>)}
                  {d.added.total > d.added.list.length && <a className="tag soft" href="/companies">ועוד {d.added.total - d.added.list.length}</a>}
                </div>
              ) : (
                <p><a className="tap" href="/companies">המאגר גדל {d.period.span} ב־{d.added.total} חברות ‹</a></p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
