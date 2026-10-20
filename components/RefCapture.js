"use client";
import { useEffect } from "react";
import { useUser } from "@/components/useUser";

// Invite links (?ref=CODE): keep the code in this browser, and once the person is signed in,
// tell the server who invited them (once). The magic link opens in the same browser, so it survives sign-in.
const KEY = "landscape-ref";
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
