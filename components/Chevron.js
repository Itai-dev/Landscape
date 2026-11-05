// A "forward" chevron after a link ("לכל המכרזים ‹"). The character ‹ is bidi-mirrored, so inside Hebrew text the
// browser flips it to › (pointing back). Isolating it as left-to-right keeps it pointing forward (left) in Hebrew.
export default function Chevron() {
  return <span className="chev" dir="ltr" aria-hidden="true">‹</span>;
}
