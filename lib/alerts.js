// Alerts on followed companies: which new updates go to whom. Pure functions over the published directory
// (site/data) plus each person's follow list; no other per-person data. Server only.
import dataset from "@/site/data/dataset.json";
import signalsFile from "@/site/data/signals.json";
import { SIG_LABEL, siteUrl } from "@/lib/digest";
import { fmtDay, todayIL, utcDay, isoOf, editionOf } from "@/lib/digestSchedule";

const DAY = 864e5;
const ORGS = new Map(dataset.orgs.map((o) => [o.id, o]));
export const SIGNALS = (signalsFile.signals || []).filter((s) => !s.hidden && s.headline_he && s.id);

// How far back a run looks. Older updates were either sent already or arrived before the follow.
export const WINDOW_DAYS = 8;
// Weekly summaries go out on the digest's Sunday and are caught up on the next two days.
const WEEKLY_CATCH_UP_DAYS = 2;
export const MAX_ALERT_ITEMS = 8;

// The day an update reached the directory (later than its own date when it was found late).
export const seenDay = (s) => (s.added && s.added > s.date ? s.added : s.date);
// The Israeli day a follow started; only updates that reached us on or after it are sent.
export const followDay = (createdAt) => todayIL(new Date(createdAt));
export const orgsOf = (s) => [...new Set([s.org_id, ...(s.related_ids || [])].filter(Boolean))];

export function orgName(id) {
  const o = ORGS.get(id);
  return o ? o.name_he || o.name : id;
}

/** Updates seen within the window ending today (Israel time). */
// `seen` maps an update to the Israeli day it was first seen on the live site (lib/alertsSend.js tracks
// that in signal_seen); without it, the day it was added to the data is used.
export function recentSignals({ now = new Date(), days = WINDOW_DAYS, signals = SIGNALS, seen = seenDay } = {}) {
  const to = todayIL(now);
  const from = isoOf(new Date(utcDay(to).getTime() - days * DAY));
  return signals.filter((s) => seen(s) > from && seen(s) <= to);
}

/** Is this person due now? Instant and daily: every run. Weekly: the digest's Sunday (+2 days), once per week. */
export function alertDue(mode, lastSentAt, now = new Date()) {
  if (mode === "daily" || mode === "instant") return true;
  if (mode !== "weekly") return false;
  const edition = editionOf(now);
  const age = Math.round((utcDay(todayIL(now)).getTime() - utcDay(edition).getTime()) / DAY);
  if (age < 0 || age > WEEKLY_CATCH_UP_DAYS) return false;
  return !lastSentAt || todayIL(new Date(lastSentAt)) < edition;
}

/**
 * alertItems({ follows, signals, sent, base }) → items for one person, newest first.
 * follows: [{ org_id, created_at }]; sent: Set of signal ids already sent (or claimed) to them.
 */
export function alertItems({ follows, signals, sent = new Set(), base = siteUrl(), seen = seenDay }) {
  const since = new Map(follows.map((f) => [f.org_id, followDay(f.created_at)]));
  const out = [];
  for (const s of signals) {
    if (sent.has(s.id)) continue;
    const hit = orgsOf(s).filter((id) => since.has(id) && seen(s) >= since.get(id));
    if (!hit.length) continue;
    const main = hit.includes(s.org_id) ? s.org_id : hit[0];
    out.push({
      id: s.id,
      type: s.type,
      label: SIG_LABEL[s.type] || "עדכון",
      headline: s.headline_he,
      why: s.why_he || "",
      date: s.date,
      day: fmtDay(s.date),
      org: { id: main, name: orgName(main), href: `${base}/companies/${encodeURIComponent(main)}` },
      also: hit.filter((id) => id !== main).map((id) => ({ id, name: orgName(id), href: `${base}/companies/${encodeURIComponent(id)}` })),
      source: s.source || "",
      source_url: s.source_url || "",
    });
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, MAX_ALERT_ITEMS);
}

export function alertSubject(items, mode) {
  const names = [...new Set(items.map((i) => i.org.name))];
  if (items.length === 1) return `עדכון על ${names[0]}: ${items[0].label}`;
  const lead = mode === "weekly" ? "השבוע בחברות שבחרתם" : "עדכונים בחברות שבחרתם";
  const rest = names.length - 2;
  const more = rest === 1 ? " ועוד חברה אחת" : rest > 1 ? ` ועוד ${rest} חברות` : "";
  return names.length === 1 ? `${items.length} עדכונים על ${names[0]}` : `${lead}: ${names.slice(0, 2).join(", ")}${more}`;
}
