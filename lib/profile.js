// Server-side cleaning of profile data (from the AI draft or the form). Never trust the client.
import { CRAFT_SLUGS, OPEN_TO_SLUGS, TOPIC_SLUGS } from "@/lib/taxonomy";

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /(?:\+\d{1,3}[\s-]?\d{1,2}|\b0\d{1,2})[\s-]?\d{3}[\s-]?\d{4}\b/g; // phones only (start with + or 0), not year ranges

export function str(v, max = 300) {
  if (typeof v !== "string") return null;
  const s = v.replace(EMAIL, "").replace(PHONE, "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

function longText(v, max = 2000) {
  if (typeof v !== "string") return null;
  const s = v.replace(EMAIL, "").replace(PHONE, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s ? s.slice(0, max) : null;
}

export function url(v) {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v.trim().match(/^https?:\/\//i) ? v.trim() : `https://${v.trim()}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

const pick = (arr, allowed, max) =>
  [...new Set((Array.isArray(arr) ? arr : []).filter((x) => allowed.includes(x)))].slice(0, max);

const strings = (arr, max, len = 60) =>
  [...new Set((Array.isArray(arr) ? arr : []).map((x) => str(x, len)).filter(Boolean))].slice(0, max);

export function cleanProfile(p = {}) {
  return {
    name: str(p.name, 120),
    headline: str(p.headline, 160),
    bio: longText(p.bio),
    city: str(p.city, 80),
    crafts: pick(p.crafts, CRAFT_SLUGS, 8),
    skills: strings(p.skills, 20),
    open_to: pick(p.open_to, OPEN_TO_SLUGS, 4),
    portfolio_url: url(p.portfolio_url),
    links: (Array.isArray(p.links) ? p.links : [])
      .map((l) => ({ label: str(l?.label, 40) || "", url: url(l?.url) }))
      .filter((l) => l.url)
      .slice(0, 8),
    experience: (Array.isArray(p.experience) ? p.experience : [])
      .map((e) => ({ org: str(e?.org, 120), role: str(e?.role, 120), start: str(e?.start, 20), end: str(e?.end, 20) }))
      .filter((e) => e.org)
      .slice(0, 12),
  };
}

export function cleanPrefs(p = {}) {
  const frequency = ["weekly", "biweekly", "monthly", "off"].includes(p.frequency) ? p.frequency : "off";
  return { frequency, topics: pick(p.topics, TOPIC_SLUGS, TOPIC_SLUGS.length) };
}

// Fields a profile needs before it's useful in the directory.
export const REQUIRED = ["name", "headline", "crafts", "city", "open_to"];

export function missingFields(p) {
  return REQUIRED.filter((k) => (Array.isArray(p[k]) ? p[k].length === 0 : !p[k]));
}

export function filledFields(p) {
  return Object.keys(p).filter((k) => (Array.isArray(p[k]) ? p[k].length > 0 : Boolean(p[k])));
}

export function makeSlug(name) {
  const base = (name || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const tail = Math.random().toString(16).slice(2, 6);
  return base ? `${base}-${tail}` : `p-${Math.random().toString(16).slice(2, 10)}`;
}
