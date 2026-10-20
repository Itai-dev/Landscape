"use client";
import { useState } from "react";
import { ALERT_MODES, ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";
import "@/components/follow.css";

const post = (body) => fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }))
  .catch(() => ({ ok: false }));

// "החברות שאתם עוקבים אחריהן": the followed companies, and how alerts arrive.
export default function FollowsClient({ initial, justFollowed }) {
  const [follows, setFollows] = useState(initial.follows);
  const [alerts, setAlerts] = useState(initial.alerts);
  const [consented, setConsented] = useState(initial.consent);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");

  async function unfollow(id) {
    const res = await post({ org_id: id, on: false });
    if (res.ok) setFollows((f) => f.filter((x) => x.id !== id));
    else setMsg("לא הצלחנו להסיר. אפשר לנסות שוב.");
  }
  async function mode(next) {
    if (next !== "off" && !consented && !consent) { setMsg("כדי לקבל התראות צריך לסמן את תיבת ההסכמה."); return; }
    const res = await post({ alerts: next, consent: !consented && consent });
    if (res.ok) { setAlerts(res.alerts); if (next !== "off") setConsented(true); setMsg(""); }
    else setMsg(res.error === "unconfirmed" ? "צריך לאשר את כתובת המייל קודם." : "לא הצלחנו לשמור. אפשר לנסות שוב.");
  }

  const fresh = justFollowed && follows.find((f) => f.id === justFollowed);
  return (
    <div className="card stack" id="follows">
      <h2>התראות על חברות</h2>
      {fresh && alerts !== "off" && <p className="notice ok" role="status">מעכשיו יגיע אליכם מייל כשמשהו משתנה ב־<bdi>{fresh.name}</bdi>.</p>}
      <p className="muted">מייל כשמשהו משתנה בחברות שאתם עוקבים אחריהן: מינוי בשיווק, החלפת משרד, קמפיין חדש. מוסיפים חברות בכפתור ״התראות על החברה״ בעמוד של כל חברה.</p>
      {follows.length ? (
        <ul className="follows-list">
          {follows.map((f) => (
            <li key={f.id}>
              <a href={f.href}><bdi>{f.name}</bdi></a>
              <button type="button" className="btn ghost sm" onClick={() => unfollow(f.id)} aria-label={`הסרת ${f.name} מההתראות`}>הסרה</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">עוד לא בחרתם חברות. <a href="/companies">לרשימת החברות</a></p>
      )}
      <div>
        <span className="label">מתי לשלוח</span>
        <div className="chips" role="radiogroup" aria-label="מתי לשלוח התראות">
          {ALERT_MODES.map((m) => (
            <label key={m.slug} className={`chip${alerts === m.slug ? " on" : ""}`}>
              <input type="radio" name="alerts-mode" checked={alerts === m.slug} onChange={() => mode(m.slug)} />
              {m.he}
            </label>
          ))}
        </div>
      </div>
      {!consented && (
        <label className="check small"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{ALERTS_CONSENT_TEXT}</span></label>
      )}
      {msg && <p className="small" role="alert">{msg}</p>}
    </div>
  );
}
