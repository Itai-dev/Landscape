import { composeDigest, craftsTitle, linkedinPost, siteUrl } from "@/lib/digest";
import { CRAFTS, CRAFT_SLUGS } from "@/lib/taxonomy";
import { isOpen as surveyOpen } from "@/lib/survey/config";
import DigestSubscribe from "@/components/DigestSubscribe";
import CopyPost from "@/components/CopyPost";
import Bidi from "@/components/Bidi";
import { LinkIcon } from "@/components/Icons";

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
  const description = top || "מה השתנה השבוע בתעשיית הקריאייטיב בישראל: מינויים, החלפות משרד, קמפיינים ומי מזמין מה.";
  const url = `${siteUrl()}/digest${d.crafts.length ? `?crafts=${d.crafts.map((c) => c.slug).join(",")}` : ""}`;
  const image = { url: "/og/digest.png", width: 1200, height: 630, alt: "השבוע בתעשייה · Landscape" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · Landscape`, description, url, type: "article", locale: "he_IL", siteName: "Landscape", images: [image] },
    twitter: { card: "summary_large_image", title: `${title} · Landscape`, description, images: [image.url] },
  };
}

function Item({ i, span }) {
  return (
    <li className="ditem">
      <div className="dmeta"><span className="dtype">{i.label}</span> · <span>{i.day}</span>{i.late && <span className="muted"> · הגיע אלינו {span}</span>}</div>
      <p className="dhead"><Bidi>{i.headline}</Bidi></p>
      {i.why && <p className="dwhy"><Bidi>{i.why}</Bidi></p>}
      <div className="dfoot">
        {i.org?.href ? <a className="tap" href={i.org.href.replace(siteUrl(), "")}><bdi>{i.org.name}</bdi></a> : i.org?.name ? <bdi>{i.org.name}</bdi> : null}
        {i.source_url && (
          <a className="src tap" href={i.source_url} target="_blank" rel="noopener noreferrer">
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
          {who ? <>מה השתנה אצל מי שמזמין <b>{who}</b>, ולמה זה רלוונטי עכשיו.</> : "מינויים, החלפות משרד, קמפיינים ומי מזמין מה. כל עדכון עם הסיבה לפנות ועם מקור."}
        </p>
      </div>

      <div className="dlayout">
        <aside className="dside" aria-label="הרשמה ושיתוף">
          <div className="panel stack" id="subscribe-panel">
            <h2>לקבל את זה במייל</h2>
            <p className="muted">ביום ראשון בבוקר, בתדירות שבוחרים ולפי התחומים שלכם. בלי ספאם, ואפשר להסיר בלחיצה.</p>
            <DigestSubscribe crafts={chosen} />
          </div>
          <div className="card stack share">
            <h3>לשתף</h3>
            <p className="muted small">פוסט מוכן עם העדכונים הבולטים וקישור לגיליון.</p>
            <CopyPost text={linkedinPost(d, base)} />
          </div>
          {surveyOpen() && (
            <div className="card stack">
              <h3>סקר התעריפים 2026</h3>
              <p className="muted small">כמה גובים בתעשייה ומתי משלמים. 4 דקות, ורואים את התוצאות.</p>
              <a className="btn soft" href="/survey">לענות על הסקר ‹</a>
            </div>
          )}
        </aside>

        <div className="dmain">
          <details className="craft-filter">
            <summary>
              <span>{who ? <>התחומים שלכם: <b>{who}</b></> : "הגיליון הכללי"}</span> <span className="change">שינוי תחומים</span>
            </summary>
            <nav className="popular" aria-label="התאמה לתחומים">
              <a className={`tag${chosen.length ? "" : " on"}`} href="/digest" aria-current={chosen.length ? undefined : "true"}>הגיליון הכללי</a>
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

          {d.more.length > 0 && (
            <section aria-labelledby="d-more">
              <div className="subhead"><h2 id="d-more">עוד בתעשייה</h2></div>
              <ol className="dlist">{d.more.map((i) => <Item key={i.id} i={i} span={d.period.span} />)}</ol>
            </section>
          )}

          {d.picks.length > 0 && (
            <section aria-labelledby="d-picks">
              <div className="subhead">
                <h2 id="d-picks">{who ? `מי מזמין ${who} עכשיו` : "מותגים ומשרדים עם חדשות"}</h2>
                <p>עם הסיבה לפנות דווקא עכשיו</p>
              </div>
              <ul className="dpicks">
                {d.picks.map((p) => (
                  <li key={p.org.id}>
                    <a className="pname tap" href={rel(p.org.href)}><bdi>{p.org.name}</bdi></a>
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
