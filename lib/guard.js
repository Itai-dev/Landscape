// Small request guards for the API routes: a body size cap and a per-key rate limit. Server only.
// The rate limit is per server instance (in memory), which is enough to stop casual abuse.

export const MAX_BODY = 32 * 1024;

// Parsed JSON body, or null when it is missing, invalid or larger than `max` bytes.
export async function readJson(request, max = MAX_BODY) {
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
