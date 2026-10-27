"use client";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { useUser } from "@/components/useUser";
import { TRACK_KEY, readTrack, setTracked } from "@/lib/trackSync";
import { useFollows } from "@/components/FollowButton";

// "מעקב" on a company page: the same tracking list as the companies app (site/app.html, Store, local mode),
// kept in this browser under "landscape-v2". Signed in, it is kept in the account too (lib/trackSync.js),
// so it works on every device. Alerts by email stay a separate choice (FollowButton).
export default function TrackButton({ orgId }) {
  const user = useUser();
  const [on, setOn] = useState(null); // null until read (no flash of the wrong state)
  const [msg, setMsg] = useState("");
  const [full, setFull] = useState(""); // the free tier is full: why, and a link to premium
  const f = useFollows(); // { max, offer, premium, follows } — the person's tracking limit
  useEffect(() => {
    const sync = () => setOn(Boolean(readTrack().pipeline?.[orgId]));
    sync();
    const onStorage = (e) => e.key === TRACK_KEY && sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("creativein-track", sync);
    window.addEventListener("creativein-track-local", sync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("creativein-track", sync); window.removeEventListener("creativein-track-local", sync); };
  }, [orgId]);

  const fullText = (max) => `בחינם אפשר לעקוב אחרי עד ${max} חברות. בפרימיום, בלי הגבלה.`;
  async function toggle() {
    const next = !on;
    setFull("");
    // Premium on: the free tier holds 10 companies (in this browser and in the account).
    if (next && f?.offer && !f.premium) {
      const count = Math.max(Object.keys(readTrack().pipeline || {}).length, f.follows?.length || 0);
      if (count >= f.max) return setFull(fullText(f.max));
    }
    if (!setTracked(orgId, next)) return setMsg("הדפדפן לא מאפשר לשמור כאן.");
    setOn(next);
    if (user) {
      const res = await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ org_id: orgId, on: next }) }).catch(() => null);
      if (res?.status === 409) {
        // The account is full: keep this browser's list the same as the account.
        const j = await res.json().catch(() => ({}));
        setTracked(orgId, false);
        setOn(false);
        return setFull(j.offer ? fullText(j.max) : `אפשר לעקוב אחרי עד ${j.max || 100} חברות.`);
      }
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
      {full && (
        <p className="small trackfull" role="alert">
          {full} <a href="/premium" data-track="premium_upsell" data-track-where="company_page">לפרימיום</a>
        </p>
      )}
    </>
  );
}
