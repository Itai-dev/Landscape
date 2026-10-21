import { siteUrl } from "@/lib/digest";
import { TOOLS } from "@/lib/chrome.mjs";

// The public pages. Companies are one page (/companies) with an anchor per company, so they aren't listed one by one.
export default function sitemap() {
  const base = siteUrl();
  const now = new Date();
  const page = (path, changeFrequency, priority) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page("/", "weekly", 1),
    page("/companies", "weekly", 0.9),
    page("/tenders", "daily", 0.9),
    page("/digest", "weekly", 0.8),
    page("/join", "monthly", 0.7),
    page("/people", "weekly", 0.7),
    page("/survey", "monthly", 0.6),
    page("/survey/results", "weekly", 0.5),
    ...(TOOLS ? [page("/tools", "weekly", 0.6)] : []),
    page("/privacy", "yearly", 0.2),
  ];
}
