import { craftLabel, openToLabel } from "@/lib/taxonomy";
import { PeopleIcon } from "@/components/Icons";

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// Stable cover colour per person, so a card looks the same on every visit.
export const coverClass = (seed = "") => {
  let h = 2166136261; // FNV-1a: spreads similar slugs across colours
  for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return `cover-${h % 6}`;
};

// A registered member: image-first card, community badge, headline on hover.
export default function PersonCard({ p }) {
  const craft = (p.crafts || [])[0];
  const open = (p.open_to || [])[0];
  return (
    <a className="shot" href={`/p/${p.slug}`}>
      <div className={`thumb ${coverClass(p.slug)}`}>
        <span className="big" aria-hidden>{initials(p.name)}</span>
        <span className="badge verified vbadge"><PeopleIcon size={14} /> חבר קהילה</span>
        {(p.headline || p.city) && (
          <div className="over">{[p.headline, p.city].filter(Boolean).join(" · ")}</div>
        )}
      </div>
      <div className="by">
        <span className="avatar" aria-hidden>{initials(p.name)}</span>
        <b>{p.name}</b>
        {craft && <span className="tag">{craftLabel(craft)}</span>}
      </div>
      {open && <div className="sub">{open === "hiring" ? openToLabel(open) : `זמינות: ${openToLabel(open)}`}</div>}
    </a>
  );
}
