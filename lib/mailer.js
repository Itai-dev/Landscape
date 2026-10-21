// Email sending through Resend's REST API, plus signed unsubscribe links. Server only.
// Without RESEND_API_KEY nothing is sent: callers get { skipped: "no_key" } and a log line.
import { createHmac, timingSafeEqual } from "node:crypto";

export const mailReady = () => Boolean(process.env.RESEND_API_KEY);
// DIGEST_FROM is either "Name <address>" (used as is) or a bare address, which then gets the sender's name
// (DIGEST_SENDER_NAME) as its display name, so the inbox never shows a bare address.
export function fromAddress() {
  const from = String(process.env.DIGEST_FROM || "").trim();
  if (!from || from.includes("<")) return from;
  const name = String(process.env.DIGEST_SENDER_NAME || "").trim().replace(/["\\\r\n]/g, "");
  return name ? `"${name}" <${from}>` : from;
}

// Who sends the email, shown in every footer (anti-spam law §30A: the sender's name, address and a way
// to reach them). Values come only from the environment; nothing is filled in when they're missing.
export function sender() {
  return {
    name: (process.env.DIGEST_SENDER_NAME || "").trim(),
    address: (process.env.DIGEST_SENDER_ADDRESS || "").trim(),
    contact: (process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "").trim(),
  };
}

// Everything a real send needs. The cron and the test route refuse to send while anything is missing.
export const SEND_ENV = ["RESEND_API_KEY", "DIGEST_FROM", "DIGEST_SENDER_NAME", "DIGEST_SENDER_ADDRESS", "NEXT_PUBLIC_PRIVACY_EMAIL"];
export const missingSendEnv = () => SEND_ENV.filter((k) => !String(process.env[k] || "").trim());

// Up to 100 messages per call. Returns the Resend ids in order.
export async function sendBatch(messages, { idempotencyKey } = {}) {
  if (!mailReady()) {
    console.warn(`mail: RESEND_API_KEY not set, ${messages.length} message(s) not sent`);
    return { skipped: "no_key", ids: [] };
  }
  const missing = missingSendEnv();
  if (missing.length) {
    console.warn(`mail: not sending, missing ${missing.join(", ")}`);
    return { skipped: "missing_env", missing, ids: [] };
  }
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

// The same kind of token for other lists (e.g. "alerts"), so one list's link can't switch off another.
export function listToken(list, userId) {
  return createHmac("sha256", secret()).update(`unsubscribe:${list}:${userId}`).digest("base64url");
}

export function verifyListToken(list, userId, token) {
  if (!secret() || !userId || !token) return false;
  const a = Buffer.from(listToken(list, String(userId)));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Cron and admin routes: "Authorization: Bearer <CRON_SECRET>" only (Vercel Cron sends this; a manual run
// uses curl -H). Never a query parameter, so the secret stays out of URLs and logs.
export function cronAuthorized(request) {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const got = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
