import PersonCard from "@/components/PersonCard";
import SeedCard from "@/components/SeedCard";
import { SearchIcon, CraftIcon } from "@/components/Icons";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";
import { searchSeeds, kindLabel } from "@/lib/people";
import { searchCompanies, companyHref } from "@/lib/companies";
import { loadMembers, hiddenSeeds } from "@/lib/members";

export const metadata = { title: "חיפוש", robots: { index: false } };

const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v))).toString();

// One search box for the whole site: companies and people together.
export default async function Search({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || "").slice(0, 80).trim();
  const craft = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  const title = q ? `"${q}"` : craft ? craftLabel(craft) : "";

  const [{ members }, hidden] = await Promise.all([loadMembers({ q, craft, limit: 8 }), hiddenSeeds()]);
  const companies = q || craft ? searchCompanies(q, craft) : [];
  const seeds = q || craft ? searchSeeds({ q, craft, exclude: hidden }) : [];
  const nothing = (q || craft) && companies.length + seeds.length + members.length === 0;

  return (
    <div className="wrap">
      <div className="pagehead">
        {craft && !q && <span className="eyebrow"><CraftIcon craft={craft} size={16} /> תחום</span>}
        <h1>{title ? <>תוצאות עבור <bdi>{title}</bdi></> : "חיפוש"}</h1>
        {(q || craft) && <p>{companies.length} חברות · {seeds.length + members.length} אנשים</p>}
      </div>
      <form className="psearch lg searchbox" role="search" action="/search">
        <input type="search" name="q" defaultValue={q} placeholder="חברה, תחום, תפקיד או שם" aria-label="חיפוש אנשים וחברות" />
        {craft && <input type="hidden" name="craft" value={craft} />}
        <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
      </form>
      {craft && (
        <div className="popular"><a className="tag on" href={`/search?${qs({ q })}`}>{craftLabel(craft)} ✕</a></div>
      )}

      {nothing && (
        <div className="panel empty" style={{ marginBlockStart: 48 }}>
          <h3>לא מצאנו כלום עבור <bdi>{title}</bdi></h3>
          <p>נסו מילה אחרת, שם באנגלית, או תחום רחב יותר.</p>
        </div>
      )}

      {companies.length > 0 && (
        <section aria-labelledby="co-h">
          <div className="subhead">
            <h2 id="co-h">חברות</h2>
            <a className="btn sm" href={`/companies?${qs({ q, craft })}`}>לכל {companies.length} החברות</a>
          </div>
          <div className="olist">
            {companies.slice(0, 9).map((o) => (
              <a key={o.id} className="orow" href={companyHref(o.id)}>
                <span className="logo">{o.logo ? <img src={o.logo} alt="" /> : (o.name_he || o.name).slice(0, 1)}</span>
                <span className="nm">
                  <b><bdi>{o.name_he || o.name}</bdi></b>
                  <span>{[kindLabel(o.kind), o.categories.slice(0, 2).map(craftLabel).join(", ")].filter(Boolean).join(" · ")}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {(members.length > 0 || seeds.length > 0) && (
        <section aria-labelledby="pp-h">
          <div className="subhead">
            <h2 id="pp-h">אנשים</h2>
            <a className="btn sm" href={`/people?${qs({ q, craft })}`}>לכל האנשים</a>
          </div>
          {members.length > 0 && <div className="grid" style={{ marginBlockEnd: 24 }}>{members.map((p) => <PersonCard key={p.slug} p={p} />)}</div>}
          {seeds.length > 0 && <div className="pgrid">{seeds.slice(0, 6).map((p) => <SeedCard key={p.id} p={p} />)}</div>}
        </section>
      )}

      {!q && !craft && (
        <section className="section">
          <div className="intro"><h2>או לפי תחום</h2></div>
          <div className="crafts">
            {CRAFTS.slice(0, 12).map((c) => (
              <a key={c.slug} className="craft" href={`/search?craft=${c.slug}`}>
                <span className="ico"><CraftIcon craft={c.slug} size={28} /></span>
                {c.he}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
