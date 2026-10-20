// The address a magic link returns to (/auth/callback), carrying what the form asked for. The server acts
// on it only after the link is opened, i.e. after the address is confirmed. Browser only.
export const REF_KEY = "landscape-ref";
const CODE_RE = /^[a-z0-9]{8}$/;

export function storedRef() {
  try {
    const v = localStorage.getItem(REF_KEY);
    return v && CODE_RE.test(v) ? v : "";
  } catch {
    return "";
  }
}

export function callbackUrl({ next = "/onboard", subscribe = "", crafts = [] } = {}) {
  const q = new URLSearchParams({ next });
  if (subscribe) q.set("subscribe", subscribe);
  if (subscribe && crafts.length) q.set("crafts", crafts.join(","));
  const ref = storedRef();
  if (ref) q.set("ref", ref);
  return `${window.location.origin}/auth/callback?${q}`;
}
