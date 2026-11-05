import { siteUrl } from "@/lib/digest";
import { TOOLS, PREMIUM } from "@/lib/chrome.mjs";
import { ORG_LIST } from "@/lib/orgs";
import { UPDATES, updatePath } from "@/lib/front";

// The public pages, one page per company (/companies/<id>, dated by its last check) and one per update.
export default function sitemap() {
  const base = siteUrl();
  const now = new Date();
  const page = (path, changeFrequency, priority) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("/", "weekly", 1),
    page("/companies", "weekly", 0.9),
    page("/updates", "daily", 0.9),
    page("/tenders", "daily", 0.9),
    page("/digest", "weekly", 0.8),
    page("/join", "monthly", 0.7),
    page("/people", "weekly", 0.7),
    page("/survey", "monthly", 0.6),
    page("/survey/results", "weekly", 0.5),
    ...(TOOLS ? [page("/tools", "weekly", 0.6)] : []),
    ...(PREMIUM ? [page("/premium", "monthly", 0.6)] : []),
    page("/privacy", "yearly", 0.2),
    page("/terms", "yearly", 0.2),
    ...ORG_LIST.filter((o) => o.status !== "closed").map((o) => ({
      url: `${base}/companies/${encodeURIComponent(o.id)}`,
      lastModified: o.last_verified ? new Date(`${o.last_verified}T00:00:00Z`) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    ...UPDATES.map((s) => ({
      url: `${base}${updatePath(s.id)}`,
      lastModified: new Date(`${s.added && s.added > s.date ? s.added : s.date}T00:00:00Z`),
      changeFrequency: "monthly",
      priority: 0.5,
    })),
  ];
}
