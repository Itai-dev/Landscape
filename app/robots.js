import { siteUrl } from "@/lib/digest";

// Public pages are indexable; account, sign-in and API routes are not.
export default function robots() {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/me", "/digest/settings", "/digest/unsubscribe", "/alerts/", "/survey/start", "/remove", "/test", "/welcome"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
