"use client";
import { prefixed } from "@/lib/bidi";
import { useEffect, useState } from "react";
import { ALERT_MODES, ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";
import { setTracked, syncTracking } from "@/lib/trackSync";
import "@/components/follow.css";

const post = (body) => fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }))
  .catch(() => ({ ok: false }));

// "המעקב שלי": the companies kept in the account (the same list as the "מעקב" buttons, on every device),
// and whether alerts about them arrive by email.
export default function FollowsClient({ initial, justFollowed }) {
  const [follows, setFollows] = useState(initial.follows);
  const [alerts, setAlerts] = useState(initial.alerts);
  const [consented, setConsented] = useState(initial.consent);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState("");
  // Companies saved in this browser before signing in join the account (once per device); show them too.
  useEffect(() => {
    syncTracking().then((r) => {
      if (!r) return;
      const known = new Set(follows.map((f) => f.id));
      const extra = r.follows.filter((id) => !known.has(id) && initial.names?.[id]).map((id) => ({ id, name: initial.names[id], href: `/companies/${encodeURIComponent(id)}` }));
      if (extra.length) setFollows((f) => [...extra, ...f]);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function unfollow(id) {
    const res = await post({ org_id: id, on: false });
    if (res.ok) { setFollows((f) => f.filter((x) => x.id !== id)); setTracked(id, false); }
    else setMsg("לא הצלחנו להסיר. נסו שוב.");
  }
  async function mode(next) {
    if (next !== "off" && !consented && !consent) { setMsg("כדי לקבל התראות, סמנו את תיבת ההסכמה."); return; }
    const res = await post({ alerts: next, consent: !consented && consent });
    if (res.ok) { setAlerts(res.alerts); if (next !== "off") setConsented(true); setMsg(""); }
    else setMsg(res.error === "unconfirmed" ? "אשרו קודם את כתובת המייל." : "לא הצלחנו לשמור. נסו שוב.");
  }

  const fresh = justFollowed && follows.find((f) => f.id === justFollowed);
  const limited = Boolean(initial.offer && initial.paywall && !initial.premium); // the free tier counts toward its limit (once payments are open)
  return (
    <div className="card stack" id="follows">
      <h2>המעקב שלי {(follows.length > 0 || limited) && <span className="count">{limited ? `${follows.length} מתוך ${initial.max}` : follows.length}</span>}</h2>
      {limited && follows.length >= initial.max && <p className="notice small">הרשימה מלאה. בחינם אפשר לעקוב אחרי עד {initial.max} חברות. <a href="/premium" data-track="premium_upsell" data-track-where="me">לפרימיום, בלי הגבלה</a></p>}
      {fresh && alerts !== "off" && <p className="notice ok" role="status">מעכשיו יגיע אליכם מייל כשמשהו משתנה <bdi>{prefixed("ב", fresh.name)}</bdi>.</p>}
      <p className="muted">החברות ששמרתם בכפתור ״מעקב״. הרשימה שמורה בחשבון, אז היא זמינה מכל מכשיר.</p>
      {follows.length ? (
        <ul className="follows-list">
          {follows.map((f) => (
            <li key={f.id}>
              <a href={f.href}><bdi>{f.name}</bdi></a>
              <button type="button" className="btn ghost sm" onClick={() => unfollow(f.id)} aria-label={`הסרת ${f.name} מהמעקב`}>הסרה</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">עוד לא שמרתם חברות. <a href="/companies">לרשימת החברות</a></p>
      )}
      <h3 className="sub">התראות במייל</h3>
      <p className="muted small">מייל כשמשהו משתנה בחברות שבמעקב: מינוי בשיווק, החלפת משרד, קמפיין חדש.</p>
      <div>
        <span className="label">מתי לשלוח</span>
        <div className="chips" role="radiogroup" aria-label="מתי לשלוח התראות">
          {ALERT_MODES.filter((m) => !m.premium || initial.premium).map((m) => (
            <label key={m.slug} className={`chip${alerts === m.slug ? " on" : ""}`}>
              <input type="radio" name="alerts-mode" checked={alerts === m.slug} onChange={() => mode(m.slug)} />
              {m.he}
            </label>
          ))}
        </div>
      </div>
      {initial.offer && !initial.premium && <p className="muted small">בפרימיום ההתראות מגיעות בתוך שעה מהפרסום. <a href="/premium">לפרימיום</a></p>}
      {!consented && (
        <label className="check small"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{ALERTS_CONSENT_TEXT}</span></label>
      )}
      {msg && <p className="small" role="alert">{msg}</p>}
    </div>
  );
}
