import { LinkIcon, MoreIcon, PersonIcon } from "@/components/Icons";
import { orgLabel, roleHe, roleTypeLabel } from "@/lib/people";
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

// One role: the company's logo and name, its type and the title as published, as one link to the company.
function RoleLink({ r }) {
  const he = r.role ? roleHe(r.role) : null;
  const o = orgById(r.org_id);
  return (
    <a className="orgline" href={companyHref(r.org_id)}>
      <span className="orglogo" aria-hidden="true">
        {o?.logo_hi ? <img src={o.logo_hi} alt="" width={36} height={36} loading="lazy" decoding="async" style={o.logo_px ? { maxWidth: Math.min(o.logo_px, 30), maxHeight: Math.min(o.logo_px, 30) } : undefined} /> : (orgLabel(r) || "").slice(0, 1)}
      </span>
      <span className="orgtext">
        <span className="org"><bdi>{orgLabel(r)}</bdi></span>
        <span className="otags">
          {o?.kind && <KindTag kind={o.kind} />}
          {r.role && <span className="ttag" title={he ? r.role : undefined}><bdi>{he || r.role}</bdi></span>}
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
