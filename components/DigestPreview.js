"use client";
import { useState } from "react";

// A compact, real preview of this week's edition. The editions are composed on the server
// (lib/digest.js) for a few crafts; the switcher only chooses which one is shown.
export default function DigestPreview({ editions }) {
  const [slug, setSlug] = useState(editions[0]?.slug);
  const ed = editions.find((e) => e.slug === slug) || editions[0];
  if (!ed) return null;
  return (
    <div className="dpreview" aria-live="polite">
      <div className="chips" role="radiogroup" aria-label="תחום לדוגמה">
        {editions.map((e) => (
          <label key={e.slug} className={`chip${e.slug === slug ? " on" : ""}`}>
            <input type="radio" name="preview-craft" checked={e.slug === slug} onChange={() => setSlug(e.slug)} />
            {e.label}
          </label>
        ))}
      </div>
      <div className="dcard">
        <div className="dtop">
          <b lang="en">Landscape<span>.</span></b>
          <span className="muted small">השבוע בתעשייה · {ed.range}</span>
        </div>
        {ed.items.length > 0 ? (
          <ul className="ditems">
            {ed.items.map((i) => (
              <li key={i.id}>
                <span className="lbl">{i.label} · {i.day}</span>
                <span className="hl">{i.headline}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">השבוע אין עדכון שמזכיר במפורש את התחום הזה. במקומו מגיעים מכרזים ומי מזמין.</p>
        )}
        {ed.tender && (
          <div className="dtender">
            <span className="lbl">מכרז פתוח · {ed.tender.countdown}</span>
            <span className="hl">{ed.tender.summary}</span>
          </div>
        )}
        {ed.pick && (
          <div className="dpick">
            <span className="lbl">מי מזמין {ed.label} עכשיו</span>
            <span className="hl"><b>{ed.pick.name}</b>{ed.pick.reason ? `: ${ed.pick.reason}` : ""}</span>
          </div>
        )}
        <a className="tap small" href={`/digest?crafts=${ed.slug}`} data-track="digest_preview_open" data-track-label={ed.slug}>לכל העדכונים של {ed.label} ‹</a>
      </div>
    </div>
  );
}
