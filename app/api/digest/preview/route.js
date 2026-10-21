import { NextResponse } from "next/server";
import { composeDigest, PERIOD_DAYS } from "@/lib/digest";
import { cleanCraftList } from "@/lib/consent";

export const runtime = "nodejs";

// GET ?crafts=a,b&frequency=weekly → a short preview of the edition those choices would get (for /join).
// Read-only, from the published directory (site/data) only: no per-person data, nothing stored.
export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const crafts = cleanCraftList(q.get("crafts"));
  const frequency = Object.hasOwn(PERIOD_DAYS, q.get("frequency")) ? q.get("frequency") : "weekly";
  const d = composeDigest({ crafts, days: PERIOD_DAYS[frequency], base: "", maxItems: 3, maxPicks: 1, maxTenders: 1 });
  const t = d.tenders[0];
  const p = d.picks[0];
  return NextResponse.json(
    {
      crafts: d.crafts,
      range: d.range,
      items: [...d.items, ...d.more].slice(0, 3).map((i) => ({ id: i.id, label: i.class_label || i.label, day: i.day, headline: i.headline })),
      tender: t ? { summary: t.summary, countdown: t.countdown } : null,
      pick: p?.org ? { name: p.org.name, reason: p.reason } : null,
    },
    { headers: { "cache-control": "public, max-age=300, s-maxage=600" } },
  );
}
