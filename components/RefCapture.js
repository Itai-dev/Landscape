"use client";
import { useEffect } from "react";
import { useUser } from "@/components/useUser";
import { REF_KEY } from "@/lib/authLink";

// Invite links (?ref=CODE): keep the code in this browser. Sign-up forms add it to the magic link
// (lib/authLink.js), so /auth/callback credits it even if the link opens elsewhere. For someone already
// signed in here, tell the server once; it counts only for a brand-new account (lib/survey/server.js).
const KEY = REF_KEY;
const SENT = "landscape-ref-sent";
const CODE_RE = /^[a-z0-9]{8}$/;

function get(k) { try { return localStorage.getItem(k); } catch { return null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch {} }

export default function RefCapture() {
  const user = useUser();
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.toLowerCase();
    if (ref && CODE_RE.test(ref) && !get(KEY)) set(KEY, ref);
  }, []);
  useEffect(() => {
    if (!user) return;
    const code = get(KEY);
    if (!code || get(SENT) === user.id) return;
    fetch("/api/referral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) })
      .then((r) => { if (r.ok || r.status === 400) set(SENT, user.id); })
      .catch(() => {});
  }, [user]);
  return null;
}
