import { bidiRuns } from "@/lib/bidi";

// Hebrew text with every Latin run (names, credits, "(BBR Saatchi)") isolated in <bdi>, so it keeps its order.
export default function Bidi({ children }) {
  return bidiRuns(children).map((r, i) => (r.latin ? <bdi key={i}>{r.text}</bdi> : <span key={i}>{r.text}</span>));
}
