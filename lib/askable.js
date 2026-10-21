// Which searches also get an AI answer on /search: questions and longer phrases, not a single name or craft.
// Keeps the shared AI budget (/api/ask is rate-limited) for searches the plain matcher can't answer well.
const QWORDS = /^(מי|מה|איפה|איזה|איזו|אילו|כמה|למה|מתי|איך|האם|יש|who|what|which|where|how|is|are|any)\b/i;

export function askable(q) {
  const s = String(q || "").trim();
  if (s.length < 6) return false;
  if (s.includes("?")) return true;
  if (QWORDS.test(s)) return true;
  return s.split(/\s+/).filter(Boolean).length >= 4;
}
