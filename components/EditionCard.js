import { WORDMARK } from "@/lib/chrome.mjs";

// A compact, real preview of an edition of the weekly email (composed by lib/digest.js on the server).
// `ed` is the shape /api/digest/preview returns.
export default function EditionCard({ ed, busy = false }) {
  if (!ed) return <div className="dcard loading" aria-busy="true"><span className="muted small">טוענים את המייל של השבוע…</span></div>;
  const label = ed.crafts?.length ? ed.crafts.map((c) => c.he).slice(0, 3).join(", ") : "";
  return (
    <div className={`dcard${busy ? " busy" : ""}`} aria-busy={busy ? "true" : undefined}>
      <div className="dtop">
        <b lang="en" dangerouslySetInnerHTML={{ __html: WORDMARK }} />
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
        <p className="muted small">השבוע אין עדכון שמזכיר במפורש את התחומים האלה. במקומו מגיעים מכרזים ומי מזמין.</p>
      )}
      {ed.tender && (
        <div className="dtender">
          <span className="lbl">מכרז · {ed.tender.countdown}</span>
          <span className="hl">{ed.tender.summary}</span>
        </div>
      )}
      {ed.pick && (
        <div className="dpick">
          <span className="lbl">{label ? `מי מזמין ${label}` : "מי מזמין עבודות קריאייטיב"}</span>
          <span className="hl"><b>{ed.pick.name}</b>{ed.pick.reason ? `: ${ed.pick.reason}` : ""}</span>
        </div>
      )}
    </div>
  );
}
