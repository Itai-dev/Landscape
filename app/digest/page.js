import { composeDigest, craftsTitle, fmtDay, linkedinPost, siteUrl } from "@/lib/digest";
import { CRAFTS, CRAFT_SLUGS } from "@/lib/taxonomy";
import DigestSubscribe from "@/components/DigestSubscribe";
import CopyPost from "@/components/CopyPost";
import { LinkIcon } from "@/components/Icons";

// Crafts shown first in the picker; the rest sit under "עוד תחומים".
const TOP = ["motion-design", "animation-3d", "animation-2d", "vfx", "post-production", "editing", "sound-design", "branding", "illustration", "commercial-production", "content-studio", "ai-creative"];

const parseCrafts = (v) => String(v || "").split(",").map((s) => s.trim()).filter((s) => CRAFT_SLUGS.includes(s)).slice(0, 8);

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const d = composeDigest({ crafts: parseCrafts(sp?.crafts) });
  const who = craftsTitle(d);
  const title = who ? `השבוע בתעשייה: ${who}` : "השבוע בתעשייה";
  const top = d.items.slice(0, 2).map((i) => i.headline).join(" · ");
  const description = top || "מה השתנה השבוע בתעשיית הקריאייטיב בישראל: מינויים, החלפות משרד, קמפיינים ומי מזמין מה.";
  const url = `${siteUrl()}/digest${d.crafts.length ? `?crafts=${d.crafts.map((c) => c.slug).join(",")}` : ""}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · Landscape`, description, url, type: "article", locale: "he_IL", siteName: "Landscape" },
    twitter: { card: "summary", title: `${title} · Landscape`, description },
  };
}

function Item({ i }) {
  return (
    <li className="ditem">
      <div className="dmeta"><span className="dtype">{i.label}</span> · <span>{i.day}</span></div>
      <p className="dhead">{i.headline}</p>
      {i.why && <p className="dwhy">{i.why}</p>}
      <div className="dfoot">
        {i.org?.href ? <a href={i.org.href.replace(siteUrl(), "")}><bdi>{i.org.name}</bdi></a> : i.org?.name ? <bdi>{i.org.name}</bdi> : null}
        {i.source_url && (
          <a className="src" href={i.source_url} target="_blank" rel="noopener noreferrer">
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
  const d = composeDigest({ crafts: chosen });
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
        <span className="eyebrow">{fmtDay(d.from)}–{fmtDay(d.to)}</span>
        <h1>השבוע בתעשייה</h1>
        <p>
          {who ? <>מה השתנה אצל מי שמזמין <b>{who}</b>, ולמה זה רלוונטי עכשיו.</> : "מינויים, החלפות משרד, קמפיינים ומי מזמין מה. כל עדכון עם הסיבה לפנות ועם מקור."}
        </p>
      </div>

      <nav className="popular" aria-label="התאמה לתחומים">
        <a className={`tag${chosen.length ? "" : " on"}`} href="/digest" aria-current={chosen.length ? undefined : "true"}>הגיליון הכללי</a>
        {CRAFTS.filter((c) => TOP.includes(c.slug) || chosen.includes(c.slug)).map((c) => (
          <a key={c.slug} className={`tag${chosen.includes(c.slug) ? " on" : ""}`} href={toggle(c.slug)} aria-current={chosen.includes(c.slug) ? "true" : undefined}>{c.he}</a>
        ))}
        <details className="more-crafts">
          <summary className="tag">עוד תחומים</summary>
          <div className="popular">
            {rest.filter((c) => !chosen.includes(c.slug)).map((c) => <a key={c.slug} className="tag" href={toggle(c.slug)}>{c.he}</a>)}
          </div>
        </details>
      </nav>

      <div className="dlayout">
        <div className="dmain">
          {d.items.length > 0 ? (
            <section aria-labelledby="d-items">
              <div className="subhead"><h2 id="d-items">{who ? "בתחומים שבחרתם" : "עדכונים מהשבוע"} <span className="count">{d.items.length}</span></h2></div>
              <ol className="dlist">{d.items.map((i) => <Item key={i.id} i={i} />)}</ol>
            </section>
          ) : (
            <div className="soon">
              <h3>{who ? `השבוע לא היו עדכונים חדשים ב${who}` : "השבוע עוד לא היו עדכונים"}</h3>
              <p>המאגר מתעדכן כל שבוע. בינתיים, הנה מי שמזמין את התחומים האלה ולמה כדאי לפנות.</p>
            </div>
          )}

          {d.more.length > 0 && (
            <section aria-labelledby="d-more">
              <div className="subhead"><h2 id="d-more">עוד בתעשייה</h2></div>
              <ol className="dlist">{d.more.map((i) => <Item key={i.id} i={i} />)}</ol>
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
                    <a className="pname" href={rel(p.org.href)}><bdi>{p.org.name}</bdi></a>
                    {p.craft && <span className="tag soft">{p.craft}</span>}
                    <p>{p.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.newOrgs.total > 0 && (
            <section aria-labelledby="d-new">
              <div className="subhead"><h2 id="d-new">חדש במאגר <span className="count">{d.newOrgs.total}</span></h2></div>
              <div className="popular start">
                {d.newOrgs.list.map((o) => <a key={o.id} className="tag" href={rel(o.href)}><bdi>{o.name}</bdi></a>)}
                {d.newOrgs.total > d.newOrgs.list.length && <a className="tag soft" href="/companies">ועוד {d.newOrgs.total - d.newOrgs.list.length} חברות</a>}
              </div>
            </section>
          )}
        </div>

        <aside className="dside" aria-label="הרשמה ושיתוף">
          <div className="panel stack" id="subscribe-panel">
            <h2>לקבל את זה במייל</h2>
            <p className="muted">כל יום ראשון בבוקר, רק התחומים שלכם. בלי ספאם, ואפשר להסיר בלחיצה.</p>
            <DigestSubscribe crafts={chosen} />
          </div>
          <div className="card stack share">
            <h3>לשתף</h3>
            <p className="muted small">פוסט מוכן עם העדכונים הבולטים וקישור לגיליון.</p>
            <CopyPost text={linkedinPost(d, base)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
