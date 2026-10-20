// Small request guards for the API routes: a body size cap and a per-key rate limit. Server only.
// The rate limit is per server instance (in memory), which is enough to stop casual abuse.

export const MAX_BODY = 32 * 1024;

// A browser request from another site? Browsers send Origin (and Sec-Fetch-Site) on every POST; a request
// that names another origin is refused. Requests without either header don't come from a browser page,
// so they carry no one's cookies. (Unsubscribe links are exempt: mail clients post them from anywhere.)
export function sameOrigin(request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Parsed JSON body, or null when it is missing, invalid, larger than `max` bytes, not sent as
// application/json, or sent from another site.
export async function readJson(request, max = MAX_BODY) {
  if (!sameOrigin(request)) return null;
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return null;
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > max) return null;
  const text = await request.text().catch(() => "");
  if (!text || text.length > max) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

const buckets = new Map();
// true while `key` has made fewer than `max` calls in the last `windowMs`.
export function allow(key, { max = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return true;
}
