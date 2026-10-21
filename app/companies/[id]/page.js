import { notFound } from "next/navigation";
import KindTag from "@/components/KindTag";
import Bidi from "@/components/Bidi";
import TrackButton from "@/components/TrackButton";
import FollowButton from "@/components/FollowButton";
import { LinkIcon, CraftIcon } from "@/components/Icons";
import { siteUrl } from "@/lib/digest";
import { fmtDay } from "@/lib/digestSchedule";
import { SEEDS, roleHe } from "@/lib/people";
import { hiddenSeeds } from "@/lib/members";
import { listTenders } from "@/lib/tenders";
import {
  ORG_LIST, orgById, orgName, cityHe, sizeHe, logoOf, reachLinks, facts, updatesFor, waysIn, similarTo,
  craftLinks, descOf, needLabel, confidenceHe, STATUS_HE, orgPath,
} from "@/lib/orgs";
import "./org.css";

// Every company has its own page, built at deploy time. People who asked to be removed leave within a minute
// (the list of hidden people is read again when a page is older than 60 seconds).
export const revalidate = 60;
export const dynamicParams = false;
export function generateStaticParams() {
  return ORG_LIST.map((o) => ({ id: o.id }));
}

function summary(o) {
  const d = descOf(o).text;
  if (d) return d.length > 160 ? `${d.slice(0, 157).replace(/\s+\S*$/, "")}…` : d;
  const kind = o.kind === "client" ? "מותג" : o.kind === "agency" ? "משרד פרסום" : o.kind === "studio" ? "סטודיו" : o.kind === "production_company" ? "חברת הפקה" : o.kind === "startup" ? "סטארטאפ" : "קהילה";
  return `${kind}${o.location?.city ? ` ב${cityHe(o.location.city)}` : ""}: מה הם עושים, מי מחליט שם ומה השתנה לאחרונה.`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const o = orgById(id);
  if (!o) return {};
  const title = orgName(o) === o.name ? o.name : `${orgName(o)} (${o.name})`;
  return {
    title,
    description: summary(o),
    alternates: { canonical: orgPath(o.id) },
    openGraph: { title: `${title} · CreativeIn`, description: summary(o), siteName: "CreativeIn", locale: "he_IL", type: "website", url: orgPath(o.id), images: [{ url: "/og/site.png", width: 1200, height: 630 }] },
  };
}

const initials = (name) => {
  const w = String(name || "").split(/\s+/).map((x) => x.replace(/[^\p{L}]/gu, "")).filter(Boolean);
  return w.length ? ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() : "";
};

function Logo({ o, size = 96, big = false }) {
  const l = logoOf(o);
  if (!l) return <span className={`otile word${big ? " big" : ""}`}><span dir="auto">{orgName(o)}</span></span>;
  const w = Math.min(size, l.px);
  return (
    <span className={`otile${big ? " big" : ""}${l.wide ? " wide" : ""}`}>
      <img src={l.src} alt="" width={w} height={w} style={{ width: l.wide ? "auto" : w, maxWidth: l.wide ? Math.min(size * 1.8, l.px) : w, height: "auto" }} decoding="async" />
    </span>
  );
}

function jsonLd(o) {
  const url = siteUrl();
  const sameAs = Object.values(o.links || {}).filter(Boolean);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: o.name,
    ...(o.name_he ? { alternateName: o.name_he } : {}),
    ...(o.website ? { url: o.website } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(o.location?.city ? { address: { "@type": "PostalAddress", addressLocality: o.location.city, addressCountry: o.location.country || "IL" } } : {}),
    ...(o.founded ? { foundingDate: String(o.founded) } : {}),
    mainEntityOfPage: `${url}${orgPath(o.id)}`,
  }).replace(/</g, "\\u003c");
}

export default async function CompanyPage({ params }) {
  const { id } = await params;
  const o = orgById(id);
  if (!o) notFound();

  const hidden = await hiddenSeeds().catch(() => new Set());
  const people = SEEDS.filter((p) => !hidden.has(p.id))
    .flatMap((p) => p.roles.filter((r) => r.org_id === o.id).map((r) => ({ id: p.id, name: p.name, role: roleHe(r.role) || r.role })));
  const latin = orgName(o) !== o.name ? o.name : o.name_he && o.name_he !== o.name ? o.name_he : "";
  const reach = reachLinks(o);
  const updates = updatesFor(o);
  const ways = waysIn(o, people);
  const crafts = craftLinks(o);
  const desc = descOf(o);
  const fs = facts(o);
  const buyer = o.kind === "client" || o.kind === "agency" || (o.needs || []).length > 0;
  const tenders = listTenders().filter((t) => t.buyer_org_id === o.id);
  const similar = similarTo(o);
  const where = [cityHe(o.location?.city), sizeHe(o.size), o.status && o.status !== "active" ? STATUS_HE[o.status] : ""].filter(Boolean).join(" · ");

  return (
    <div className="wrap orgpage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(o) }} />
      <nav className="crumb" aria-label="מיקום">
        <a href="/companies">חברות</a> <span aria-hidden="true">‹</span> <bdi>{orgName(o)}</bdi>
      </nav>

      <header className="ohead">
        <Logo o={o} size={96} big />
        <div className="oid">
          <div className="okind"><KindTag kind={o.kind} />{where && <span className="where">{where}</span>}</div>
          <h1><bdi>{orgName(o)}</bdi></h1>
          {latin && <p className="alt"><bdi dir="auto">{latin}</bdi></p>}
          <div className="oactions">
            <TrackButton orgId={o.id} />
            <FollowButton orgId={o.id} orgName={orgName(o)} />
            {o.website && (
              <a className="btn" href={o.website} target="_blank" rel="noopener" data-link-type="website" data-track="company_link_click" data-track-category="website">
                אתר <LinkIcon size={16} />
              </a>
            )}
          </div>
        </div>
      </header>

      {reach.length > 0 && (
        <section className="osec reach" aria-labelledby="reach-h">
          <h2 id="reach-h">יצירת קשר וערוצים רשמיים</h2>
          <div className="olinks">
            {reach.map((l) => (
              <a key={l.type + l.href} className="chiplink" href={l.href} target="_blank" rel="noopener" data-track="company_link_click" data-track-category={l.type}>
                {l.label} <LinkIcon size={14} />
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="ogrid">
        <div className="omain">
          {desc.text && (
            <section className="osec" aria-labelledby="desc-h">
              <h2 id="desc-h">תיאור</h2>
              <p className="desc" dir="auto"><Bidi>{desc.text}</Bidi></p>
              {desc.english && <p className="small muted">התיאור באנגלית, כפי שנאסף מהמקורות.</p>}
            </section>
          )}

          {updates.length > 0 && (
            <section className="osec" aria-labelledby="upd-h">
              <h2 id="upd-h">מה השתנה לאחרונה</h2>
              <ol className="oupd">
                {updates.map((u) => (
                  <li key={u.id} className="ucard">
                    <p className="umeta"><b>{u.label}</b>{u.day ? ` · ${u.day}` : ""}</p>
                    <p className="uhead"><Bidi>{u.headline}</Bidi></p>
                    {u.why && <p className="uwhy">למה זה יכול להיות רלוונטי: <Bidi>{u.why}</Bidi></p>}
                    {u.source_url && (
                      <p className="uorg">
                        <a className="tap" href={u.source_url} target="_blank" rel="noopener noreferrer" data-track="opportunity_source_click" data-track-category={u.type} data-track-where="company_page">
                          <bdi>{u.source || "מקור"}</bdi> <LinkIcon size={14} />
                        </a>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {tenders.length > 0 && (
            <section className="osec" aria-labelledby="ten-h">
              <h2 id="ten-h">מכרזים שפרסמו</h2>
              <ul className="otenders">
                {tenders.map((t) => (
                  <li key={t.id}>
                    <a href={t.source_url} target="_blank" rel="noopener" data-track="tender_source_click">
                      <span className="small muted">{t.kind_he}{t.when ? ` · ${t.when}` : ""}</span>
                      <span>{t.scope_summary || t.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {buyer && ((o.needs || []).length > 0 || o.client_profile?.in_house_studio) && (
            <section className="osec" aria-labelledby="buy-h">
              <h2 id="buy-h">מה הם מזמינים</h2>
              {(o.needs || []).length > 0 && <div className="opills">{o.needs.map((n) => <span key={n} className="tag">{needLabel(n)}</span>)}</div>}
              {o.client_profile?.in_house_studio && <p className="small">יש להם צוות קריאייטיב פנימי.</p>}
            </section>
          )}

          {ways.length > 0 && (
            <section className="osec" aria-labelledby="ways-h">
              <h2 id="ways-h">איך להגיע אליהם</h2>
              <div className="oways">
                {ways.map((g) => (
                  <div key={g.title} className="grp">
                    <h3>{g.title}</h3>
                    {g.people ? (
                      <ul className="opeople">
                        {g.people.map((p) => (
                          <li key={p.id + p.role}>
                            <a className="pl" href={`/people?q=${encodeURIComponent(p.name)}`}>
                              <span className="avatar initials" aria-hidden="true" lang="en">{initials(p.name)}</span>
                              <span className="pn"><bdi>{p.name}</bdi></span>
                              <span className="pr"><bdi>{p.role}</bdi></span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ochips">
                        {g.orgs.map((x) => (
                          <a key={x.id} className="ochip" href={x.href} data-track="company_open" data-track-where="company_page">
                            {x.logo ? <img src={x.logo.src} alt="" width="24" height="24" loading="lazy" decoding="async" /> : <span className="mono" aria-hidden="true">{initials(x.latin || x.name)}</span>}
                            <bdi>{x.name}</bdi>
                          </a>
                        ))}
                        {g.plain.map((n) => <span key={n} className="ochip plain"><bdi>{n}</bdi></span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="oside">
          {fs.length > 0 && (
            <section className="osec" aria-labelledby="facts-h">
              <h2 id="facts-h">פרטים</h2>
              <dl className="ofacts">{fs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </section>
          )}
          {crafts.length > 0 && (
            <section className="osec" aria-labelledby="crafts-h">
              <h2 id="crafts-h">תחומים</h2>
              <div className="opills">
                {crafts.map((c) => (
                  <a key={c.slug} className="tag" href={`/search?craft=${c.slug}`}><CraftIcon craft={c.slug} size={16} /> {c.label}</a>
                ))}
              </div>
            </section>
          )}
          {((o.services || []).length > 0 || (o.notable_work || []).length > 0 || (o.funding?.investors || []).length > 0) && (
            <section className="osec" aria-labelledby="work-h">
              <h2 id="work-h">עבודות, שירותים ומשקיעים</h2>
              {(o.services || []).length > 0 && (<><h3>שירותים ומוצרים</h3><ul className="plain" dir="auto">{o.services.map((s) => <li key={s}><Bidi>{s}</Bidi></li>)}</ul></>)}
              {(o.notable_work || []).length > 0 && (<><h3>עבודות בולטות</h3><ul className="plain" dir="auto">{o.notable_work.map((s) => <li key={s}><Bidi>{s}</Bidi></li>)}</ul></>)}
              {(o.funding?.investors || []).length > 0 && (<><h3>משקיעים</h3><p className="small"><bdi>{o.funding.investors.join(", ")}</bdi></p></>)}
            </section>
          )}
          <section className="osec sources" aria-labelledby="src-h">
            <h2 id="src-h">מקורות</h2>
            <p className="small muted">רמת ביטחון {confidenceHe(o.confidence)}{o.last_verified ? ` · נבדק ${fmtDay(o.last_verified)}` : ""}</p>
            <ul className="plain small">
              {(o.sources || []).map((s) => {
                let host = s;
                try { host = new URL(s).hostname.replace(/^www\./, ""); } catch {}
                return <li key={s}><a className="src" href={s} target="_blank" rel="noopener noreferrer"><bdi>{host}</bdi></a></li>;
              })}
            </ul>
            <p className="small"><a href="/feedback" data-track="feedback_open" data-track-where="company_page">משהו לא מדויק? בקשת תיקון או הסרה</a></p>
          </section>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="osec similar" aria-labelledby="sim-h">
          <div className="sechead"><h2 id="sim-h">חברות דומות</h2><a className="btn" href={`/companies?kind=${o.kind}`}>לכל החברות מהסוג הזה</a></div>
          <div className="osim">
            {similar.map((x) => (
              <a key={x.id} className="simcard" href={x.href} data-track="company_open" data-track-where="similar">
                <span className="frame">{x.logo ? <span className="otile"><img src={x.logo.src} alt="" width={Math.min(76, x.logo.px)} height={Math.min(76, x.logo.px)} loading="lazy" decoding="async" /></span> : <span className="otile word"><span dir="auto">{x.name}</span></span>}</span>
                <span className="by"><bdi className="n">{x.name}</bdi><span className="k"><KindTag kind={x.kind} />{x.city && <span className="kw">{x.city}</span>}</span></span>
                {x.line && <span className="info" dir="auto">{x.line.length > 110 ? `${x.line.slice(0, 107).replace(/\s+\S*$/, "")}…` : x.line}</span>}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
