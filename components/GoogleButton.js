"use client";
import { useEffect, useRef, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { GOOGLE_CLIENT_ID } from "@/lib/oauth";

// Google's own sign-in button (Google Identity Services). The Google window opens from this page, so it names
// creativein.co.il; the ID token it returns signs in to Supabase directly (signInWithIdToken, with a nonce).
// Then /api/auth/after applies what the form asked for, exactly as a magic link would, and the page moves on.
// `redirectTo()` is the callback link a magic link would use; only its query and `next` are read here.

let scriptPromise;
function loadGsi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("gsi failed to load")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function newNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export default function GoogleButton({ redirectTo, disabled = false, onStart, onError }) {
  const { supabase } = useSupabase();
  const box = useRef(null);
  const latest = useRef({ redirectTo, onStart, onError });
  latest.current = { redirectTo, onStart, onError };
  const [state, setState] = useState("loading"); // loading | ready | busy | failed

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await loadGsi();
        const nonce = await newNonce();
        if (!live || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          ux_mode: "popup",
          context: "signin",
          itp_support: true,
          use_fedcm_for_button: true,
          callback: async (resp) => {
            const { redirectTo: link, onStart: started, onError: failed } = latest.current;
            setState("busy");
            started?.("google");
            const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: resp.credential, nonce: nonce.raw });
            if (error) { setState("ready"); failed?.(); return; }
            const url = new URL(link());
            await fetch("/api/auth/after", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: url.search.slice(1) }) }).catch(() => {});
            window.location.assign(url.searchParams.get("next") || "/me");
          },
        });
        const width = Math.max(200, Math.min(400, Math.round(box.current.getBoundingClientRect().width || 320)));
        window.google.accounts.id.renderButton(box.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "center", locale: "he", width });
        setState("ready");
      } catch {
        if (live) setState("failed");
      }
    })();
    return () => { live = false; };
  }, [supabase]);

  if (state === "failed") return null;
  return (
    <div className={`gsi${disabled || state === "busy" ? " off" : ""}`} aria-disabled={disabled || undefined}>
      <div ref={box} className="gsi-box" />
      {state === "busy" && <span className="spinner gsi-spin" aria-label="מתחברים…" />}
    </div>
  );
}
