import { LinkIcon, MoreIcon, PersonIcon } from "@/components/Icons";
import { orgLabel, roleHe } from "@/lib/people";
import { companyHref, orgById } from "@/lib/companies";
import KindTag from "@/components/KindTag";

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "מקור";
  }
};
const month = (d) => (d ? new Date(d).toLocaleDateString("he-IL", { month: "long", year: "numeric" }) : "");

// The title as published, in Hebrew when it's a known loanword ("Head of Production" → its Hebrew form).
const titleOf = (r) => (r?.role ? roleHe(r.role) || r.role : "");

// A company line: logo, name and type, as one link to the company. `title` is shown only for a person's other
// roles (the first role's title sits under the name).
function RoleLink({ r, title = false }) {
  const o = orgById(r.org_id);
  return (
    <a className="orgline" href={companyHref(r.org_id)}>
      <span className="orglogo" aria-hidden="true">
        {o?.logo_hi ? <img src={o.logo_hi} alt="" width={36} height={36} loading="lazy" decoding="async" style={o.logo_px ? { maxWidth: Math.min(o.logo_px, 30), maxHeight: Math.min(o.logo_px, 30) } : undefined} /> : (orgLabel(r) || "").slice(0, 1)}
      </span>
      <span className="orgtext">
        {title && titleOf(r) && <span className="otitle"><bdi>{titleOf(r)}</bdi></span>}
        <span className="orgrow">
          <span className="org"><bdi>{orgLabel(r)}</bdi></span>
          {o?.kind && <KindTag kind={o.kind} />}
        </span>
      </span>
    </a>
  );
}

// A person listed from public sources (a company site, the trade press). Not a member: no profile page, no contact details.
// The page explains "from public sources" once, so the card doesn't repeat it. The claim button shows only when
// profiles are on (NEXT_PUBLIC_PROFILES) and sign-up is open.
// Two initials from the listed name ("Amit Krasny" → "AK"). Letters only, never a picture.
const initials = (name) => {
  const w = String(name || "").split(/\s+/).map((x) => x.replace(/[^\p{L}]/gu, "")).filter(Boolean);
  if (!w.length) return "";
  return ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

export default function SeedCard({ p, claim = false }) {
  const [first, ...rest] = p.roles;
  return (
    <article className="pcard">
      <div className="head">
        <span className="avatar md initials" aria-hidden lang="en">{initials(p.name) || <PersonIcon size={22} />}</span>
        <div>
          <h3><bdi>{p.name}</bdi></h3>
          {titleOf(first) && <p className="ptitle"><bdi>{titleOf(first)}</bdi></p>}
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
        {[first, ...rest.slice(0, 1)].map((r, i) => <RoleLink key={i} r={r} title={i > 0} />)}
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
