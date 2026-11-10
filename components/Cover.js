// Pictures for updates. An update's own picture when it has one (official sources only, always credited);
// otherwise a drawn cover: the company's logo on a grey tile, the section's name set large behind it. Never
// a scraped news photo. `i` is an updateItem from lib/front.js.

const initials = (name) => {
  const words = String(name || "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "").slice(0, 2)).toUpperCase();
};

function LogoTile({ org, size, className = "" }) {
  if (org?.logo) {
    const px = org.logo_px ? Math.min(org.logo_px, size) : size;
    return (
      <span className={`cv-logo${org.logo_wide ? " wide" : ""} ${className}`}>
        <img src={org.logo} alt="" width={px} height={px} loading="lazy" decoding="async" style={org.logo_px ? { maxWidth: org.logo_px, maxHeight: org.logo_px } : undefined} />
      </span>
    );
  }
  return <span className={`cv-logo word ${className}`} aria-hidden="true"><bdi>{initials(org?.latin || org?.name)}</bdi></span>;
}

/** A small square for list rows: the picture, else the company's logo, else its initials. */
export function Thumb({ i, size = 72 }) {
  const org = i.org?.logo ? i.org : i.logos?.[0] || i.org;
  if (i.image) {
    return <span className="cv-thumb photo" style={{ "--sz": `${size}px` }}><img src={i.image.src} alt="" width={size} height={size} loading="lazy" decoding="async" /></span>;
  }
  return <span className="cv-thumb" style={{ "--sz": `${size}px` }}><LogoTile org={org} size={size} /></span>;
}

/** A wide cover for the story of the week and the update's page. */
export default function Cover({ i, priority = false }) {
  if (i.image) {
    return (
      <figure className="cv-cover photo">
        <img src={i.image.src} alt="" width={i.image.w} height={i.image.h} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : undefined} />
        {i.image.credit && (
          <figcaption>
            {i.image.from ? <a href={i.image.from} target="_blank" rel="noopener noreferrer"><bdi>{i.image.credit}</bdi></a> : <bdi>{i.image.credit}</bdi>}
          </figcaption>
        )}
      </figure>
    );
  }
  const word = i.beat_he || i.label || "";
  const logos = i.logos || [];
  return (
    <div className="cv-cover drawn" aria-hidden="true">
      <span className="cv-word">{word}</span>
      {logos.length > 0
        ? <span className={`cv-logos n${logos.length}`}>{logos.map((o) => <LogoTile key={o.id} org={o} size={128} className="big" />)}</span>
        : i.org?.name && <span className="cv-name"><bdi>{i.org.name}</bdi></span>}
    </div>
  );
}
