import PersonCard from "@/components/PersonCard";
import SeedCard from "@/components/SeedCard";
import { SearchIcon, CraftIcon, XIcon } from "@/components/Icons";
import FollowButton from "@/components/FollowButton";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";
import { searchSeeds, kindLabel } from "@/lib/people";
import { searchCompanies, companyHref } from "@/lib/companies";
import { loadMembers, hiddenSeeds } from "@/lib/members";
import { PROFILES_ENABLED } from "@/lib/config";
import { parseQuery } from "@/lib/match";
import { supabaseConfig } from "@/lib/config";
import { listTenders } from "@/lib/tenders";
import "../tenders/tenders.css";

export const metadata = { title: "חיפוש", robots: { index: false } };

const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v))).toString();

// One search box for the whole site: companies and people together.
export default async function Search({ searchParams }) {
  const sp = await searchParams;
  const typed = String(sp?.q || "").slice(0, 80).trim();
  const asked = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  // A query that is a craft's name ("מושן", "VFX") is that craft: the same results and counts as the craft page.
  // A question ("מי מזמין מושן בתל אביב") becomes the craft plus the remaining words ("תל אביב").
  const parsed = asked ? { craft: "", q: typed } : parseQuery(typed);
  const named = parsed.craft;
  const craft = asked || named;
  const q = parsed.q;
  const any = Boolean(q || craft);
  const claim = PROFILES_ENABLED && Boolean(supabaseConfig());

  const [{ members }, hidden] = await Promise.all([PROFILES_ENABLED ? loadMembers({ q, craft, limit: 8 }) : { members: [] }, hiddenSeeds()]);
  const companies = any ? searchCompanies(q, craft) : [];
  const seeds = any ? searchSeeds({ q, craft, exclude: hidden }) : [];
  const people = seeds.length + members.length;
  // Open tenders for the same words or craft (they also count as results).
  const tenders = any ? listTenders({ q, craft }) : [];
  const nothing = any && companies.length + people + tenders.length === 0;

  return (
    <div className="wrap">
      <div className="pagehead list">
        {craft && !q ? (
          <h1 className="withicon"><span className="ico"><CraftIcon craft={craft} size={26} /></span>{craftLabel(craft)}</h1>
        ) : (
          <h1>{q ? <>תוצאות ל<bdi>״{q}״</bdi></> : "חיפוש בכל האתר"}</h1>
        )}
        {any ? <p>{companies.length} חברות · {people} אנשים{tenders.length ? ` · ${tenders.length} מכרזים פתוחים` : ""}</p> : <p>חברות, סטודיואים, מותגים ואנשים. לפי שם, תחום או תפקיד.</p>}
      </div>
      <form className="psearch lg searchbox" role="search" action="/search">
        <input type="search" name="q" defaultValue={q} placeholder={craft && !q ? `חיפוש בתוך ${craftLabel(craft)}` : "חברה, תחום, תפקיד או שם"} aria-label="חיפוש בכל האתר" />
        {craft && <input type="hidden" name="craft" value={craft} />}
        <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
      </form>
      {craft && q && (
        <div className="popular">
          <a className="tag on" href={`/search?${qs({ q })}`} aria-label={`הסרת הסינון ${craftLabel(craft)}`}>{craftLabel(craft)} <XIcon size={14} /></a>
        </div>
      )}

      {nothing && (
        <div className="soon" style={{ marginBlockStart: 48 }}>
          <h3>לא מצאנו כלום ל<bdi>״{q || craftLabel(craft)}״</bdi></h3>
          <p>אפשר לנסות מילה אחרת, שם באנגלית או תחום רחב יותר.</p>
        </div>
      )}

      {tenders.length > 0 && (
        <section aria-labelledby="td-h">
          <div className="subhead">
            <h2 id="td-h">מכרזים פתוחים <span className="count">{tenders.length}</span></h2>
            <a className="btn sm" href={`/tenders?${qs({ q, craft })}`}>למכרזים</a>
          </div>
          <div className="tresults">
            {tenders.slice(0, 4).map((t) => (
              <a key={t.id} className="trow" href={`/tenders?${qs({ q, craft })}`}>
                <b>{t.scope_summary}</b>
                <span>{t.buyer_name_he || t.buyer} · {t.countdown.text} · הגשה עד <bdi>{t.deadline}</bdi></span>
              </a>
            ))}
          </div>
        </section>
      )}

      {companies.length > 0 && (
        <section aria-labelledby="co-h">
          <div className="subhead">
            <h2 id="co-h">חברות <span className="count">{companies.length}</span></h2>
            <a className="btn sm" href={`/companies?${qs({ q, craft })}`}>{companies.length > 9 ? "לכל החברות ברשימה" : "לרשימת החברות"}</a>
          </div>
          <div className="olist">
            {companies.slice(0, 9).map((o) => (
              <div key={o.id} className="orow-wrap">
                <a className="orow" href={companyHref(o.id)}>
                  <span className="logo">{o.logo ? <img src={o.logo} alt="" /> : (o.name_he || o.name).slice(0, 1)}</span>
                  <span className="nm">
                    <b><bdi>{o.name_he || o.name}</bdi></b>
                    <span>{[kindLabel(o.kind), ["client", "agency"].includes(o.kind) && o.buys.length ? `מזמינים ${o.buys.slice(0, 2).join(", ")}` : o.categories.slice(0, 2).map(craftLabel).join(", ")].filter(Boolean).join(" · ")}</span>
                  </span>
                </a>
                <FollowButton orgId={o.id} orgName={o.name_he || o.name} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {people > 0 && (
        <section aria-labelledby="pp-h">
          <div className="subhead">
            <h2 id="pp-h">אנשים <span className="count">{people}</span></h2>
            <a className="btn sm" href={`/people?${qs({ q, craft })}`}>{people > 6 ? "לכל האנשים ברשימה" : "לרשימת האנשים"}</a>
          </div>
          {members.length > 0 && <div className="grid" style={{ marginBlockEnd: 24 }}>{members.map((p) => <PersonCard key={p.slug} p={p} />)}</div>}
          {seeds.length > 0 && <div className="pgrid">{seeds.slice(0, 6).map((p) => <SeedCard key={p.id} p={p} claim={claim} />)}</div>}
        </section>
      )}

      {!any && (
        <section className="section">
          <div className="intro"><h2>או לפי תחום</h2></div>
          <div className="crafts">
            {CRAFTS.slice(0, 12).map((c) => (
              <a key={c.slug} className="craft" href={`/search?craft=${c.slug}`}>
                <span className="ico"><CraftIcon craft={c.slug} size={28} /></span>
                <span className="lbl">{c.he}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
