// Companies to suggest following right after sign-up (/welcome): buyers who commission the reader's crafts,
// those with recent news first (the same picks the weekly email makes). Server only.
import { composeDigest } from "@/lib/digest";

export const MAX_SUGGEST = 9;

export function suggestCompanies(crafts = []) {
  const d = composeDigest({ crafts, days: 30, maxItems: 0, maxPicks: MAX_SUGGEST, maxTenders: 0 });
  return (d.picks || [])
    .filter((p) => p.org?.id)
    .map((p) => ({ id: p.org.id, name: p.org.name, kind: p.org.kind, logo: p.org.logo_hi || null, logo_px: p.org.logo_px || null, reason: p.reason || "" }));
}
