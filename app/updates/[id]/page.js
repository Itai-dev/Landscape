import { notFound } from "next/navigation";
import KindTag from "@/components/KindTag";
import Bidi from "@/components/Bidi";
import TrackButton from "@/components/TrackButton";
import FollowButton from "@/components/FollowButton";
import DigestSubscribe from "@/components/DigestSubscribe";
import { LinkIcon } from "@/components/Icons";
import { UPDATES, updateById, updateItem, moreAbout, relatedUpdates } from "@/lib/front";
import { siteUrl, WHY_HE } from "@/lib/digest";
import "@/app/front.css";
import "../updates.css";

// One page per update (/updates/<id>): our summary, why it matters, who's credited (linked to their company
// pages), the official source, and more on the same companies and section. Built at deploy time.
export const dynamicParams = false;
export function generateStaticParams() {
  return UPDATES.map((s) => ({ id: s.id }));
}

const clip = (t, n) => (t.length > n ? `${t.slice(0, n - 3).replace(/\s+\S*$/, "")}…` : t);

export async function generateMetadata({ params }) {
  const { id } = await params;
  const s = updateById(id);
  if (!s) return {};
  const i = updateItem(s);
  const title = i.title;
  const description = clip(i.headline, 160);
  const url = `${siteUrl()}${i.href}`;
  return {
    title,
    description,
    alternates: { canonical: i.href },
    openGraph: { title: `${title} · CreativeIn`, description, siteName: "CreativeIn", locale: "he_IL", type: "article", url, publishedTime: `${i.date}T00:00:00+02:00`, images: [{ url: "/og/site.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${title} · CreativeIn`, description },
  };
}

function jsonLd(i) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: i.title,
    description: i.headline,
    datePublished: i.seen,
    dateModified: i.seen,
    inLanguage: "he",
    publisher: { "@type": "Organization", name: "CreativeIn", url: siteUrl() },
    mainEntityOfPage: `${siteUrl()}${i.href}`,
    ...(i.source_url ? { citation: i.source_url } : {}),
    ...(i.org?.id ? { about: { "@type": "Organization", name: i.org.latin || i.org.name, url: `${siteUrl()}${i.org.href}` } } : {}),
  }).replace(/</g, "\\u003c");
}

function Row({ i, where }) {
  return (
    <li className="upd-row">
      <p className="upd-meta"><span>{i.class_label}</span> · <span>{i.day}</span></p>
      <a className="upd-head" href={i.href} data-track="update_open" data-track-where={where}><Bidi>{i.title}</Bidi></a>
      {i.org?.name && <p className="upd-org"><bdi>{i.org.name}</bdi>{i.org.kind && <KindTag kind={i.org.kind} />}</p>}
    </li>
  );
}

export default async function UpdatePage({ params }) {
  const { id } = await params;
  const s = updateById(id);
  if (!s) notFound();
  const i = updateItem(s);
  const about = moreAbout(s);
  const related = relatedUpdates(s, { skip: about.map((x) => x.id) });
  const companies = [i.org?.id ? i.org : null, ...i.credits.map((c) => c.org), ...i.related].filter((o, n, a) => o?.id && a.findIndex((x) => x?.id === o.id) === n);

  return (
    <div className="wrap upd-one">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(i) }} />
      <nav className="crumbs" aria-label="מיקום">
        <a href="/updates">עדכונים</a> <span aria-hidden="true">‹</span> {i.beat_he ? <a href={`/updates?beat=${i.beat}`}>{i.beat_he}</a> : <b>{i.label}</b>}
      </nav>

      <article className="upd-article">
        <p className="fp-kicker"><span className="fp-badge">{i.class === "opportunity" ? "הזדמנות" : "עדכון"}</span><span>{i.label} · {i.day}</span>{i.late && <span className="muted">· הגיע אלינו ב־{new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${i.seen}T00:00:00Z`))}</span>}</p>
        <h1><Bidi>{i.title}</Bidi></h1>
        {i.headline !== i.title && <p className="upd-summary"><Bidi>{i.headline}</Bidi></p>}
        {i.why && <p className="upd-why"><b>{WHY_HE}:</b> <Bidi>{i.why}</Bidi></p>}

        {(i.credits.length > 0 || i.org) && (
          <div className="fp-credits upd-credits">
            {i.org && (
              <div className="fp-credit">
                <span className="fp-role">{i.org.kind === "client" ? "המותג" : "החברה"}</span>
                <span className="fp-who">{i.org.href ? <a href={i.org.href} data-track="company_open" data-track-where="update_page"><bdi>{i.org.name}</bdi></a> : <bdi>{i.org.name}</bdi>}</span>
                {i.org.kind && <KindTag kind={i.org.kind} />}
              </div>
            )}
            {i.credits.map((c) => (
              <div key={c.role + c.who} className="fp-credit">
                <span className="fp-role">{c.role_he}</span>
                <span className="fp-who">{c.org ? <a href={c.org.href} data-track="company_open" data-track-where="update_page"><bdi>{c.org.name}</bdi></a> : <bdi>{c.who}</bdi>}</span>
                {c.org?.kind && <KindTag kind={c.org.kind} />}
              </div>
            ))}
            {i.related.map((o) => (
              <div key={o.id} className="fp-credit">
                <span className="fp-role">קשור</span>
                <span className="fp-who"><a href={o.href} data-track="company_open" data-track-where="update_page"><bdi>{o.name}</bdi></a></span>
                <KindTag kind={o.kind} />
              </div>
            ))}
          </div>
        )}

        <div className="upd-foot">
          {i.source_url
            ? <a className="btn" href={i.source_url} target="_blank" rel="noopener noreferrer" data-track="opportunity_source_click" data-track-category={i.type} data-track-where="update_page">{i.class === "opportunity" ? "למשרה במקור" : "לכתבה במקור"}: <bdi>{i.source || "מקור"}</bdi> <LinkIcon size={14} /></a>
            : i.source && <span className="muted small">מקור: <bdi>{i.source}</bdi></span>}
          {i.crafts.length > 0 && <p className="upd-crafts muted small">תחומים: {i.crafts.map((c, n) => <span key={c.slug}>{n ? ", " : ""}<a href={`/updates?crafts=${c.slug}`}>{c.he}</a></span>)}</p>}
        </div>
        <p className="muted small upd-note">התקציר שלנו, לפי הפרסום במקור. משהו לא מדויק? <a href="/feedback" data-track="feedback_open" data-track-where="update_page">בקשת תיקון</a></p>
      </article>

      {companies.length > 0 && (
        <section className="upd-sec" aria-labelledby="track-h">
          <h2 id="track-h">לעקוב אחרי {companies.length === 1 ? <bdi>{companies[0].name}</bdi> : "החברות"}</h2>
          <p className="muted">ברשימת המעקב שלכם, ובמייל כשמשהו משתנה אצלן.</p>
          <ul className="upd-track">
            {companies.map((o) => (
              <li key={o.id}>
                <a className="upd-track-name" href={o.href} data-track="company_open" data-track-where="update_page"><bdi>{o.name}</bdi><KindTag kind={o.kind} /></a>
                <span className="upd-track-btns"><TrackButton orgId={o.id} /><FollowButton orgId={o.id} orgName={o.name} compact /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {about.length > 0 && (
        <section className="upd-sec" aria-labelledby="about-h">
          <h2 id="about-h">עוד על {companies.length === 1 ? <bdi>{companies[0].name}</bdi> : "החברות האלה"}</h2>
          <ol className="upd-list">{about.map((x) => <Row key={x.id} i={x} where="update_more_about" />)}</ol>
        </section>
      )}

      {related.length > 0 && (
        <section className="upd-sec" aria-labelledby="rel-h">
          <h2 id="rel-h">עוד {i.beat_he ? <a href={`/updates?beat=${i.beat}`}>{i.beat_he}</a> : "עדכונים"}</h2>
          <ol className="upd-list">{related.map((x) => <Row key={x.id} i={x} where="update_related" />)}</ol>
        </section>
      )}

      <section className="panel inverse upd-cta" aria-labelledby="ucta-h">
        <h2 id="ucta-h">עדכונים כאלה, בתחומים שלכם, כל יום ראשון במייל.</h2>
        <DigestSubscribe compact where="update-page" />
      </section>
    </div>
  );
}
