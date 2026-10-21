import { LinkIcon, MoreIcon, PersonIcon } from "@/components/Icons";
import { orgLabel, roleHe, roleTypeLabel } from "@/lib/people";
import { companyHref } from "@/lib/companies";

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "מקור";
  }
};
const month = (d) => (d ? new Date(d).toLocaleDateString("he-IL", { month: "long", year: "numeric" }) : "");

// One role: the company and the title as published, as a single link to the company (a large tap area).
function RoleLink({ r }) {
  const he = r.role ? roleHe(r.role) : null;
  return (
    <a className="orgline" href={companyHref(r.org_id)}>
      <span className="org"><bdi>{orgLabel(r)}</bdi></span>
      {r.role && <span className="role" title={he ? r.role : undefined}><bdi>{he || r.role}</bdi></span>}
    </a>
  );
}

// A person listed from public sources (a company site, the trade press). Not a member: no profile page, no contact details.
// The page explains "from public sources" once, so the card doesn't repeat it. The claim button shows only when
// profiles are on (NEXT_PUBLIC_PROFILES) and sign-up is open.
export default function SeedCard({ p, claim = false }) {
  const [first, ...rest] = p.roles;
  return (
    <article className="pcard">
      <div className="head">
        {p.avatar ? (
          // An illustration made from the listing id, not a photo of the person (the name follows as text).
          <span className="avatar md drawn" title="איור, לא תמונה של האדם">
            <img src={p.avatar} width={48} height={48} loading="lazy" decoding="async" alt="" />
          </span>
        ) : (
          <span className="avatar md soft" aria-hidden><PersonIcon size={22} /></span>
        )}
        <div>
          <h3><bdi>{p.name}</bdi></h3>
          {roleTypeLabel(first.role_type) && <span className="kindlabel">{roleTypeLabel(first.role_type)}</span>}
        </div>
        <details className="menu">
          <summary aria-label={`עוד אפשרויות: ${p.name}`}><MoreIcon size={20} /></summary>
          <div className="pop">
            <a href={`/remove?id=${encodeURIComponent(p.id)}`}>בקשת הסרה</a>
            <a href="/privacy#public">מאיפה המידע</a>
          </div>
        </details>
      </div>
      <div className="roles">
        {[first, ...rest.slice(0, 1)].map((r, i) => <RoleLink key={i} r={r} />)}
        {rest.length > 1 && <p className="role muted">ועוד {rest.length - 1} תפקידים</p>}
      </div>
      <div className="meta">
        <a href={first.source} rel="nofollow noopener" target="_blank"><LinkIcon size={14} /> <bdi>{host(first.source)}</bdi></a>
        {first.as_of && <span>נכון ל{month(first.as_of)}</span>}
      </div>
      {claim && (
        <div className="acts">
          <a className="btn sm soft" href={`/onboard?claim=${encodeURIComponent(p.id)}`}>זה אני</a>
        </div>
      )}
    </article>
  );
}
