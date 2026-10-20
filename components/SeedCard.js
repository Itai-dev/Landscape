import { initials } from "@/components/PersonCard";
import { LinkIcon } from "@/components/Icons";
import { orgLabel, roleTypeLabel } from "@/lib/people";
import { companyHref } from "@/lib/companies";

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "מקור";
  }
};
const month = (d) => (d ? new Date(d).toLocaleDateString("he-IL", { month: "short", year: "numeric" }) : "");

// A person listed from public sources (a company site, the trade press). Not a member: no profile page, no contact details.
export default function SeedCard({ p }) {
  const [first, ...rest] = p.roles;
  return (
    <article className="pcard">
      <div className="head">
        <span className="avatar md soft" aria-hidden>{initials(p.name)}</span>
        <div>
          <h3><bdi>{p.name}</bdi></h3>
          <span className="badge public">ממקורות פומביים</span>
        </div>
      </div>
      <div>
        {[first, ...rest.slice(0, 1)].map((r, i) => (
          <div key={i} style={i ? { marginBlockStart: 8 } : undefined}>
            <p className="org"><a href={companyHref(r.org_id)}><bdi>{orgLabel(r)}</bdi></a></p>
            {r.role && <p className="role"><bdi>{r.role}</bdi></p>}
          </div>
        ))}
        {rest.length > 1 && <p className="role muted">ועוד {rest.length - 1} תפקידים</p>}
      </div>
      <div className="meta">
        {roleTypeLabel(first.role_type) && <span>{roleTypeLabel(first.role_type)}</span>}
        <a href={first.source} rel="nofollow noopener" target="_blank"><LinkIcon size={12} /> {host(first.source)}</a>
        {first.as_of && <span>נבדק {month(first.as_of)}</span>}
      </div>
      <div className="acts">
        <a className="btn sm soft" href={`/onboard?claim=${encodeURIComponent(p.id)}`}>זה אני</a>
        <a className="quiet" href={`/remove?id=${encodeURIComponent(p.id)}`}>בקשת הסרה</a>
      </div>
    </article>
  );
}
