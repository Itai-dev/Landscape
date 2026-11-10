// "This browser belongs to someone who already signed up", kept in localStorage ("landscape-joined"), with no
// personal data: "pending" after the sign-up form was sent, "yes" once signed in here or after arriving from
// one of our emails (utm_source=email). People often confirm the link inside a mail app's own browser, so
// the session isn't here; this flag still stops the site from asking them to sign up again. Client only.
export const JOINED_KEY = "landscape-joined";
export const JOINED_EVENT = "creativein-joined";

export function readJoined() {
  try { return localStorage.getItem(JOINED_KEY) || ""; } catch { return ""; }
}

export function setJoined(value) {
  if (value === "pending" && readJoined() === "yes") return;
  try { localStorage.setItem(JOINED_KEY, value); } catch {}
  try { window.dispatchEvent(new Event(JOINED_EVENT)); } catch {}
}

// Our emails' links carry utm_source=email.
export function markFromEmail(search = "") {
  if (/(?:^|[?&])utm_source=email(?:&|$)/.test(search)) setJoined("yes");
}
