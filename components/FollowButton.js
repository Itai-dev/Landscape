"use client";
import { useEffect, useRef, useState } from "react";
import { BellIcon, CheckIcon } from "@/components/Icons";
import { ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";
import { prefixed } from "@/lib/bidi";
import { setTracked } from "@/lib/trackSync";
import "./follow.css";

// One request per page for the follow state, shared by every button on it.
let cache = null;
const listeners = new Set();
const load = () => (cache ||= fetch("/api/follows", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ signup: false, follows: [] })));
function publish(next) {
  cache = Promise.resolve(next);
  listeners.forEach((l) => l(next));
}
export function useFollows() {
  const [state, setState] = useState(null);
  useEffect(() => {
    let on = true;
    load().then((v) => on && setState(v));
    listeners.add(setState);
    // The tracking button (or the account sync) changed the follows: read them again.
    const again = () => { cache = null; load().then((v) => publish(v)); };
    window.addEventListener("creativein-track", again);
    return () => { on = false; listeners.delete(setState); window.removeEventListener("creativein-track", again); };
  }, []);
  return state;
}

/**
 * "התראות על החברה": follow a company and get an email when something changes there.
 * Signed in: toggles at once (the first time also asks for alerts consent). Signed out: email + consent,
 * then a sign-in link; the follow is recorded only after the address is confirmed.
 */
export default function FollowButton({ orgId, orgName, compact = false }) {
  const s = useFollows();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | busy | sent | error
  const [msg, setMsg] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (e.key === "Escape" || (e.type === "pointerdown" && box.current && !box.current.contains(e.target))) setOpen(false); };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, [open]);

  if (!s || !s.signup) return null;
  // Signed in, a follow is the company in the account's tracking list; alerts are on when the account has them on.
  const following = Boolean(s.signedIn && s.follows?.includes(orgId));
  const alerting = following && s.alerts && s.alerts !== "off";
  const label = alerting ? "מקבלים התראות" : "התראות על החברה";

  async function toggle(withConsent = false) {
    setPhase("busy");
    setMsg("");
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ org_id: orgId, on: !following, ...(withConsent ? { consent: true } : {}) }),
    }).catch(() => null);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setPhase("error");
      setMsg(j?.error === "limit" ? "אפשר לעקוב אחרי עד 100 חברות." : j?.error === "unconfirmed" ? "אשרו קודם את כתובת המייל." : "לא הצלחנו לשמור. נסו שוב.");
      return;
    }
    const follows = following ? s.follows.filter((id) => id !== orgId) : [...(s.follows || []), orgId];
    setTracked(orgId, !following); // the same company in this browser's tracking list
    publish({ ...s, follows, alerts: j.alerts || s.alerts, consent: s.consent || withConsent });
    try { window.dispatchEvent(new Event("creativein-track-local")); } catch {}
    setPhase("idle");
    setOpen(!following && j.alerts === "off"); // following, but alerts are off: say so
  }

  async function start(e) {
    e.preventDefault();
    if (!consent) return;
    setPhase("busy");
    const res = await fetch("/api/follows/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), org_id: orgId, consent: true }),
    }).catch(() => null);
    const j = await res?.json().catch(() => ({}));
    if (res?.ok) setPhase("sent");
    else { setPhase("error"); setMsg(j?.error === "rate_limited" ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." : j?.error === "bad_email" ? "בדקו את כתובת המייל." : "משהו השתבש. נסו שוב."); }
  }

  // Already tracked, alerts never agreed to: the consent switches alerts on for the account (no unfollow).
  async function enableAlerts() {
    setPhase("busy");
    const res = await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ alerts: "daily", consent: true }) }).catch(() => null);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) { setPhase("error"); setMsg(j?.error === "unconfirmed" ? "אשרו קודם את כתובת המייל." : "לא הצלחנו לשמור. נסו שוב."); return; }
    publish({ ...s, alerts: j.alerts || "daily", consent: true });
    setPhase("idle");
    setOpen(false);
  }

  function onClick() {
    if (!s.signedIn) return setOpen((v) => !v);
    // The first follow asks for alerts consent once; afterwards it's one tap.
    if (!following && !s.consent) return setOpen((v) => !v);
    // Tracked, but alerts are off for the account: say so (and where to switch them on).
    if (following && !alerting) return setOpen((v) => !v);
    toggle(false);
  }

  return (
    <span className="follow" ref={box}>
      <button
        type="button"
        className={`btn ${compact ? "icon" : "sm"} follow-btn${alerting ? " on" : ""}`}
        aria-pressed={Boolean(alerting)}
        aria-expanded={open}
        aria-label={compact ? `${label}: ${orgName}` : undefined}
        title={compact ? label : undefined}
        data-track="follow_click"
        onClick={onClick}
        disabled={phase === "busy"}
      >
        {alerting ? <CheckIcon size={18} /> : <BellIcon size={18} />}
        {!compact && <span>{label}</span>}
      </button>
      {open && (
        <div className="follow-pop" role="dialog" aria-label={`התראות על ${orgName}`}>
          {s.signedIn && following && !alerting && s.consent ? (
            <p className="small">החברה במעקב שלכם, וההתראות במייל כבויות. אפשר להפעיל אותן ב<a href="/me#follows">חשבון שלי</a>.</p>
          ) : s.signedIn ? (
            <form className="stack" onSubmit={(e) => { e.preventDefault(); if (consent) (following ? enableAlerts() : toggle(true)); }}>
              <p className="small"><b>מייל כשמשהו משתנה <bdi>{prefixed("ב", orgName)}</bdi></b>: מינוי בשיווק, החלפת משרד, קמפיין חדש.</p>
              <label className="check small"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /><span>{ALERTS_CONSENT_TEXT}</span></label>
              <button className="btn primary sm" disabled={!consent || phase === "busy"}>להפעלת ההתראות</button>
              {msg && <p className="small err" role="alert">{msg}</p>}
            </form>
          ) : phase === "sent" ? (
            <p className="small" role="status"><b>שלחנו קישור אישור ל־<span className="ltr">{email}</span>.</b> פתחו אותו באותו מכשיר ובאותו דפדפן. לא הגיע? בדקו בספאם.</p>
          ) : (
            <form className="stack" onSubmit={start}>
              <p className="small"><b>מייל כשמשהו משתנה <bdi>{prefixed("ב", orgName)}</bdi></b>: מינוי בשיווק, החלפת משרד, קמפיין חדש. בלי סיסמה.</p>
              <input type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" aria-label="מייל" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="check small"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /><span>{ALERTS_CONSENT_TEXT}</span></label>
              <button className="btn primary sm" disabled={!consent || phase === "busy"}>שליחת קישור אישור</button>
              {msg && <p className="small err" role="alert">{msg}</p>}
            </form>
          )}
        </div>
      )}
    </span>
  );
}
