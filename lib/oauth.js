// Sign-in with Google and Apple (Supabase OAuth). Off until each provider is set up in Supabase:
// NEXT_PUBLIC_OAUTH lists the ones to show, e.g. "google,apple". Read on the server and in the browser.
const KNOWN = ["google", "apple"];

export const OAUTH = String(process.env.NEXT_PUBLIC_OAUTH || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((p, i, a) => KNOWN.includes(p) && a.indexOf(p) === i);

// Google's own button on the page (Google Identity Services) instead of the redirect through Supabase, so the
// Google window names creativein.co.il and not the Supabase address. Needs the OAuth client's public id;
// without it the Google button falls back to the redirect flow.
export const GOOGLE_CLIENT_ID = String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
