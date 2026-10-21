"use client";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";

// "מעקב" on a company page: the same tracking list as the companies app (site/app.html, Store, local mode),
// kept in this browser under "landscape-v2". Saving here shows up in /companies → מעקב, and the other way round.
const KEY = "landscape-v2";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } };
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

export default function TrackButton({ orgId }) {
  const [on, setOn] = useState(null); // null until read (no flash of the wrong state)
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const sync = () => setOn(Boolean(read().pipeline?.[orgId]));
    sync();
    const onStorage = (e) => e.key === KEY && sync();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [orgId]);

  function toggle() {
    const s = read();
    const pipeline = { ...(s.pipeline || {}) };
    if (pipeline[orgId]) delete pipeline[orgId];
    else pipeline[orgId] = { org_id: orgId, stage: "to_pitch", added: today(), updated_at: new Date().toISOString(), v: 1 };
    if (!write({ ...s, pipeline, prefs: s.prefs || { crafts: [] } })) return setMsg("הדפדפן לא מאפשר לשמור כאן.");
    setOn(Boolean(pipeline[orgId]));
    setMsg(pipeline[orgId] ? "נשמר לרשימת המעקב בדפדפן הזה." : "הוסר מהמעקב.");
  }

  return (
    <>
      <button type="button" className={`btn${on ? "" : " primary"}`} aria-pressed={Boolean(on)} onClick={toggle} data-track="track_click" data-track-where="company_page">
        {on ? <CheckIcon size={18} /> : null}
        <span>{on ? "במעקב" : "מעקב"}</span>
      </button>
      <span className="sr-only" role="status">{msg}</span>
      {on && <a className="btn ghost sm" href="/companies#pipeline">לרשימת המעקב</a>}
    </>
  );
}
