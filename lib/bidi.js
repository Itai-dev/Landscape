// Splits Hebrew text into runs so Latin names, credits and brackets around them ("(BBR Saatchi)",
// "No, No, No, No, No, Yes") keep their order inside right-to-left text. Each Latin run is isolated
// (<bdi> in HTML and React). Pure, no imports: safe for the server, the email and client components.

// A Latin run: starts with a Latin letter or digit, may contain spaces, punctuation and digits, and may be
// wrapped in brackets or quotes. It ends on a Latin letter, digit or closing mark.
const LATIN_RUN = /[("״“'‘]?[A-Za-z0-9][A-Za-z0-9&.,'’+\-/:!?%$ ]*[A-Za-z0-9.!?%)"״”'’]|[("״“]?[A-Za-z][)"״”]?/g;

export function bidiRuns(text) {
  const s = String(text ?? "");
  const out = [];
  let last = 0;
  for (const m of s.matchAll(LATIN_RUN)) {
    // Only isolate runs that contain a Latin letter (keep plain numbers in the flow).
    if (!/[A-Za-z]/.test(m[0])) continue;
    if (m.index > last) out.push({ latin: false, text: s.slice(last, m.index) });
    out.push({ latin: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ latin: false, text: s.slice(last) });
  return out;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Escaped HTML with every Latin run wrapped in <bdi>.
// A Hebrew prefix letter (ב, ל, מ…) before a name: the maqaf goes only before a name that doesn't start with
// a Hebrew letter ("בשופרסל", but "ב־Wix").
export const prefixed = (p, name) => `${p}${/^[֐-׿]/.test(String(name || "")) ? "" : "־"}${name}`;

export const bidiHtml =(text) => bidiRuns(text).map((r) => (r.latin ? `<bdi>${esc(r.text)}</bdi>` : esc(r.text))).join("");

// Shortens text to about `max` characters at a word boundary.
export function clip(text, max = 120) {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}
