import { KIND } from "@/lib/kinds.mjs";

// A company type as a two-part tag: icon segment + label segment, coloured per type (app/chrome.css).
export default function KindTag({ kind, many = false, label }) {
  const k = KIND[kind];
  if (!k) return null;
  return (
    <span className={`ktag k-${kind}`}>
      <span className="ki" dangerouslySetInnerHTML={{ __html: k.icon }} />
      <span className="kl">{label ?? (many ? k.plural_he : k.label_he)}</span>
    </span>
  );
}
