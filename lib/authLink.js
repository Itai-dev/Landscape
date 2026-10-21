// The address a magic link returns to (/auth/callback), carrying what the form asked for. The server acts
// on it only after the link is opened, i.e. after the address is confirmed. Browser only.
import { PROFILES } from "./chrome.mjs";

export const REF_KEY = "landscape-ref";

// A plausible address (the real check is the confirmation link). Trimmed and lower-cased before sending.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export const normalEmail = (v) => String(v || "").trim().toLowerCase();
export const validEmail = (v) => EMAIL_RE.test(normalEmail(v));
const CODE_RE = /^[a-z0-9]{8}$/;

export function storedRef() {
  try {
    const v = localStorage.getItem(REF_KEY);
    return v && CODE_RE.test(v) ? v : "";
  } catch {
    return "";
  }
}

export function callbackUrl({ next = PROFILES ? "/onboard" : "/digest/settings", subscribe = "", crafts = [] } = {}) {
  const q = new URLSearchParams({ next });
  if (subscribe) q.set("subscribe", subscribe);
  if (subscribe && crafts.length) q.set("crafts", crafts.join(","));
  const ref = storedRef();
  if (ref) q.set("ref", ref);
  return `${window.location.origin}/auth/callback?${q}`;
}
