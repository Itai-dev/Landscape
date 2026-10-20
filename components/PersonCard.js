import { craftLabel, openToLabel } from "@/lib/taxonomy";

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export default function PersonCard({ p }) {
  return (
    <a className="card person" href={`/p/${p.slug}`}>
      <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <div className="avatar" aria-hidden>{initials(p.name)}</div>
        <div style={{ minWidth: 0 }}>
          <h3>{p.name}</h3>
          {p.headline && <div className="muted">{p.headline}</div>}
          {p.city && <div className="small muted">{p.city}</div>}
        </div>
      </div>
      <div className="meta">
        {(p.crafts || []).slice(0, 3).map((c) => <span key={c} className="tag">{craftLabel(c)}</span>)}
        {(p.open_to || []).slice(0, 2).map((o) => <span key={o} className="tag" style={{ borderColor: "var(--ok)" }}>{openToLabel(o)}</span>)}
      </div>
    </a>
  );
}
