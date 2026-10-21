"use client";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { useUser } from "@/components/useUser";
import { TRACK_KEY, readTrack, setTracked } from "@/lib/trackSync";

// "מעקב" on a company page: the same tracking list as the companies app (site/app.html, Store, local mode),
// kept in this browser under "landscape-v2". Signed in, it is kept in the account too (lib/trackSync.js),
// so it works on every device. Alerts by email stay a separate choice (FollowButton).
export default function TrackButton({ orgId }) {
  const user = useUser();
  const [on, setOn] = useState(null); // null until read (no flash of the wrong state)
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const sync = () => setOn(Boolean(readTrack().pipeline?.[orgId]));
    sync();
    const onStorage = (e) => e.key === TRACK_KEY && sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("creativein-track", sync);
    window.addEventListener("creativein-track-local", sync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("creativein-track", sync); window.removeEventListener("creativein-track-local", sync); };
  }, [orgId]);

  async function toggle() {
    const next = !on;
    if (!setTracked(orgId, next)) return setMsg("הדפדפן לא מאפשר לשמור כאן.");
    setOn(next);
    if (user) {
      await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ org_id: orgId, on: next }) }).catch(() => null);
      window.dispatchEvent(new Event("creativein-track")); // the alerts button reads the follows again
    }
    setMsg(next ? (user ? "נשמר במעקב שלכם." : "נשמר לרשימת המעקב בדפדפן הזה.") : "הוסר מהמעקב.");
  }

  return (
    <>
      <button type="button" className={`btn${on ? "" : " primary"}`} aria-pressed={Boolean(on)} onClick={toggle} data-track="track_click" data-track-where="company_page">
        {on ? <CheckIcon size={18} /> : null}
        <span>{on ? "במעקב" : "מעקב"}</span>
      </button>
      <span className="sr-only" role="status">{msg}</span>
      {on && <a className="btn ghost sm" href={user ? "/me#follows" : "/companies#pipeline"}>{user ? "למעקב שלי" : "לרשימת המעקב"}</a>}
    </>
  );
}
