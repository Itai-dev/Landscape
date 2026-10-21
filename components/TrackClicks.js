"use client";
import { useEffect } from "react";
import { track } from "@vercel/analytics";

// Any element with data-track="event_name" reports a click to Vercel Web Analytics (custom events need
// a plan that has them; otherwise track() is a no-op). Forms call track() themselves on submit.
export default function TrackClicks() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.("[data-track]");
      if (!el) return;
      try { track(el.getAttribute("data-track"), el.dataset.trackLabel ? { label: el.dataset.trackLabel } : undefined); } catch {}
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
