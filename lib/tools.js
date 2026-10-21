// "כלים ו־AI": a catalog of creative tools and dated updates from the makers' own changelogs and blogs,
// built by `landscape.py build` into site/data/tools.json from data/tools/. Official links only: no affiliate
// links, no paid placement. Everything here is behind the TOOLS flag (lib/chrome.mjs, NEXT_PUBLIC_TOOLS=on).
import file from "@/site/data/tools.json";
import { TOOLS as TOOLS_ON } from "@/lib/chrome.mjs";
import { fmtDay } from "@/lib/digestSchedule";
import { craftLabel } from "@/lib/taxonomy";
import { fold } from "@/lib/match";
import { soundsLike } from "@/lib/translit";

export const toolsEnabled = () => TOOLS_ON;

const DAY = 864e5;
const CATALOG = file.tools || [];
const UPDATES = file.updates || [];
const BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

export const CATEGORY_HE = {
  "video-ai": "וידאו עם AI",
  "image-ai": "תמונות עם AI",
  design: "עיצוב",
  "3d": "תלת־ממד",
  motion: "מושן",
  "sound-ai": "סאונד ומוזיקה עם AI",
  editing: "עריכה ופוסט",
  workflow: "תהליכי עבודה",
};
export const CATEGORY_ORDER = ["video-ai", "image-ai", "design", "motion", "3d", "editing", "sound-ai", "workflow"];
export const PRICING_HE = { free: "חינם", freemium: "יש גרסה חינמית", paid: "בתשלום" };

const ilToday = (now) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);

function toUpdate(u) {
  const t = BY_ID.get(u.tool_id);
  return {
    id: u.id,
    tool_id: u.tool_id,
    tool: t?.name || u.tool_name || u.tool_id,
    category: t?.category || "",
    url: t?.url || "",
    date: u.date,
    day: fmtDay(u.date),
    headline: u.headline_he,
    why: u.why_he,
    crafts: u.crafts,
    source_url: u.source_url,
  };
}

/** Updates from the last `days` days, newest first. */
export function toolUpdates({ days = 60, now = new Date(), max = 50 } = {}) {
  const today = ilToday(now);
  const from = new Date(Date.parse(today) - days * DAY).toISOString().slice(0, 10);
  return UPDATES.filter((u) => u.date <= today && u.date >= from).slice(0, max).map(toUpdate);
}

/** The digest's "כלים ו־AI השבוע": up to `max` recent updates, the reader's crafts first, else the newest. */
export function toolsFor(crafts = [], { now = new Date(), days = 30, max = 3 } = {}) {
  if (!TOOLS_ON) return [];
  const pool = toolUpdates({ days, now });
  if (!crafts.length) return pool.slice(0, max);
  const mine = pool.filter((u) => u.crafts.some((c) => crafts.includes(c)));
  return (mine.length ? mine : pool).slice(0, max);
}

/** The catalog grouped by category, in CATEGORY_ORDER. */
export function catalogByCategory() {
  return CATEGORY_ORDER.map((c) => ({
    key: c,
    label: CATEGORY_HE[c],
    tools: CATALOG.filter((t) => t.category === c).map((t) => ({
      ...t,
      pricing_he: t.pricing ? PRICING_HE[t.pricing] : "",
      crafts_he: t.crafts.slice(0, 3).map(craftLabel),
    })),
  })).filter((g) => g.tools.length);
}

/** Tools whose name (or maker) matches the query, for /search. */
export function searchTools(q = "") {
  if (!TOOLS_ON) return [];
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  return CATALOG.filter((t) => {
    const hay = fold(`${t.name} ${t.maker}`);
    return words.every((w) => hay.includes(w) || soundsLike(w, `${t.name} ${t.maker}`));
  }).slice(0, 8);
}

export const toolCount = () => CATALOG.length;
