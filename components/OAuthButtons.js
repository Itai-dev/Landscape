"use client";
import { useState } from "react";
import { track } from "@vercel/analytics";
import { useSupabase } from "@/components/Providers";
import { OAUTH, GOOGLE_CLIENT_ID } from "@/lib/oauth";
import GoogleButton from "@/components/GoogleButton";

const GOOGLE = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
const APPLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.17-1.54 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.51zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.07 1.96-.49 2.56-1.21z" />
  </svg>
);
const PROVIDERS = {
  google: { label: "כניסה עם Google", icon: GOOGLE },
  apple: { label: "כניסה עם Apple", icon: APPLE },
};

// "כניסה עם Google / Apple" above an email form. Returns nothing until a provider is switched on (lib/oauth.js).
// Google uses its own button on the page when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set (components/GoogleButton.js),
// otherwise the redirect through Supabase, like Apple.
// The provider confirms the address, so the same /auth/callback link a magic link uses does the rest
// (crafts, the newsletter opt-in, the follow). `redirectTo` builds that link at click time, so it carries
// whatever the form holds by then; `disabled` holds the buttons until the form is ready (e.g. consent ticked).
export default function OAuthButtons({ redirectTo, disabled = false, where = "", onStart }) {
  const { supabase, configured } = useSupabase();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!configured || !OAUTH.length) return null;

  async function go(provider) {
    setBusy(provider);
    setError("");
    try { track("oauth_start", { provider, where }); } catch {}
    onStart?.(provider);
    let err;
    try {
      ({ error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } }));
    } catch (e) {
      err = e;
    }
    // On success the browser is already leaving for the provider's page.
    if (err) {
      setBusy("");
      setError("לא הצלחנו להתחבר כרגע. אפשר לנסות שוב, או להיכנס עם קישור במייל.");
    }
  }

  return (
    <div className="oauth">
      {OAUTH.map((p) => p === "google" && GOOGLE_CLIENT_ID ? (
        <GoogleButton key={p} redirectTo={redirectTo} disabled={disabled || Boolean(busy)}
          onStart={(provider) => { setError(""); try { track("oauth_start", { provider, where }); } catch {} onStart?.(provider); }}
          onError={() => setError("לא הצלחנו להתחבר כרגע. אפשר לנסות שוב, או להיכנס עם קישור במייל.")} />
      ) : (
        <button key={p} type="button" className={`btn oauthbtn ${p}`} disabled={disabled || Boolean(busy)} onClick={() => go(p)}>
          {busy === p ? <span className="spinner" aria-hidden /> : PROVIDERS[p].icon}
          {PROVIDERS[p].label}
        </button>
      ))}
      {error && <div className="notice err" role="alert">{error}</div>}
      <p className="oauth-or"><span>או עם קישור במייל</span></p>
    </div>
  );
}
