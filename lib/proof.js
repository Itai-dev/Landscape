// Live proof for the home page: real numbers and real items from the published directory (site/data).
// Nothing here is invented — every count is computed from the data files at render time. Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import { listTenders } from "@/lib/tenders";
import { SIG_LABEL } from "@/lib/digest";
import { fmtDay } from "@/lib/digestSchedule";

const DAY = 864e5;
// Source names as Israeli readers know them (Latin names stay Latin).
const SOURCE_HE = { Globes: "גלובס", "LinkedIn Jobs": "משרות בלינקדאין", Geektime: "גיקטיים", CTech: "כלכליסט" };
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && s.headline_he).sort((a, b) => String(b.date).localeCompare(String(a.date)));

const ilToday = (now) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
const daysAgo = (iso, now) => Math.round((Date.parse(ilToday(now)) - Date.parse(iso)) / DAY);

function orgOf(s) {
  const o = s.org_id ? ORGS.get(s.org_id) : null;
  if (o) return { name: o.name_he || o.name, href: `/companies#${encodeURIComponent(o.id)}` };
  return s.org_name ? { name: s.org_name, href: null } : null;
}

function item(s) {
  return {
    id: s.id,
    type: s.type,
    label: SIG_LABEL[s.type] || "עדכון",
    headline: s.headline_he,
    day: fmtDay(s.date),
    org: orgOf(s),
    source: s.source || "",
    href: s.org_id && ORGS.has(s.org_id) ? `/companies#${encodeURIComponent(s.org_id)}` : s.source_url || "/companies#signals",
  };
}

/**
 * {
 *   window: days counted, updates: n, appointments: n, agencyMoves: n, jobs: n,
 *   openTenders: n, nearestTender: tender|null, latest: [3 items], examples: [up to 3 {kind, ...}],
 *   sources: ["ICE", "Globes", …]
 * }
 */
export function liveProof(now = new Date(), windowDays = 14) {
  const recent = SIGNALS.filter((s) => daysAgo(s.date, now) <= windowDays && daysAgo(s.date, now) >= 0);
  const count = (t) => recent.filter((s) => s.type === t).length;
  const tenders = listTenders({ now });
  const nearest = tenders[0] || null;

  // Three concrete things a creative could act on this week: a new decision-maker, an agency switch, a tender.
  // Skip what the 'latest' list already shows, so the examples add something.
  const latestIds = new Set(SIGNALS.slice(0, 3).map((s) => s.id));
  const newest = (types) => SIGNALS.find((s) => types.includes(s.type) && !latestIds.has(s.id) && daysAgo(s.date, now) <= 60);
  const examples = [];
  const exec = newest(["new_exec"]);
  if (exec) examples.push({ kind: "exec", title: "מישהו חדש מחליט", ...item(exec) });
  const move = newest(["agency_move"]);
  if (move) examples.push({ kind: "move", title: "מותג החליף משרד", ...item(move) });
  if (nearest) examples.push({ kind: "tender", title: "עבודה שאפשר להגיש עליה", headline: nearest.scope_summary, day: nearest.countdown.text, org: { name: nearest.buyer_name_he || nearest.buyer, href: nearest.buyer_href }, href: "/tenders", label: "מכרז פתוח", source: "mr.gov.il" });
  if (examples.length < 3) {
    const camp = newest(["campaign"]);
    if (camp) examples.push({ kind: "campaign", title: "קמפיין חדש, ומי עשה אותו", ...item(camp) });
  }

  const sources = [...new Set(SIGNALS.map((s) => SOURCE_HE[s.source] || s.source).filter(Boolean))].slice(0, 6);
  return {
    window: windowDays,
    updates: recent.length,
    appointments: count("new_exec"),
    agencyMoves: count("agency_move"),
    jobs: count("hiring"),
    campaigns: count("campaign"),
    openTenders: tenders.length,
    nearestTender: nearest,
    latest: SIGNALS.slice(0, 3).map(item),
    examples: examples.slice(0, 3),
    sources,
  };
}
