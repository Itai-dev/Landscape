// Email sending through Resend's REST API, plus signed unsubscribe links. Server only.
// Without RESEND_API_KEY nothing is sent: callers get { skipped: "no_key" } and a log line.
import { createHmac, timingSafeEqual } from "node:crypto";

export const mailReady = () => Boolean(process.env.RESEND_API_KEY);
export const fromAddress = () => process.env.DIGEST_FROM || "Landscape <onboarding@resend.dev>";

// Up to 100 messages per call. Returns the Resend ids in order.
export async function sendBatch(messages, { idempotencyKey } = {}) {
  if (!mailReady()) {
    console.warn(`mail: RESEND_API_KEY not set, ${messages.length} message(s) not sent`);
    return { skipped: "no_key", ids: [] };
  }
  if (!process.env.DIGEST_FROM) console.warn("mail: DIGEST_FROM not set; Resend's test sender only delivers to the account owner");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify(messages.map((m) => ({ from: fromAddress(), ...m }))),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`resend ${res.status}: ${body?.name || body?.message || "error"}`);
    e.status = res.status;
    throw e;
  }
  return { ids: (body.data || []).map((d) => d.id) };
}

// --- Unsubscribe tokens: HMAC of the user id, no expiry (an unsubscribe link must keep working) ---------
const secret = () => process.env.DIGEST_SECRET || process.env.CRON_SECRET || "";
export const tokensReady = () => Boolean(secret());

export function unsubscribeToken(userId) {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url");
}

export function verifyUnsubscribe(userId, token) {
  if (!secret() || !userId || !token) return false;
  const a = Buffer.from(unsubscribeToken(String(userId)));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Cron and admin routes: "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sends this), or ?key= for a manual run.
export function cronAuthorized(request) {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const got = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || new URL(request.url).searchParams.get("key") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
