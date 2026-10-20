"use client";
import { useState } from "react";

const ERR = {
  not_configured: "השליחה לא זמינה כרגע. מה שמילאתם נשאר כאן, אפשר לנסות שוב בעוד כמה דקות.",
  save_failed: "השמירה נכשלה. מה שמילאתם נשאר כאן, אפשר לנסות שוב.",
  confirm: "צריך לסמן את התיבה.",
  not_found: "לא מצאנו את האדם הזה במאגר. אולי כבר הוסר.",
};

export default function RemoveForm({ id, email = "" }) {
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState({ busy: false, done: false, error: "" });

  async function send(e) {
    e.preventDefault();
    setState({ busy: true, done: false, error: "" });
    const res = await fetch("/api/removal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, reason, contact, confirm }),
    }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setState({ busy: false, done: true, error: "" });
    else setState({ busy: false, done: false, error: ERR[out.error] || "השליחה נכשלה. מה שמילאתם נשאר כאן, אפשר לנסות שוב." });
  }

  if (state.done) {
    return (
      <div className="notice ok" role="status">
        <b>הבקשה התקבלה.</b> הכרטיס יורד מהאתר, והשם יוסר מרשומת החברה בסבב העדכון הקרוב.
      </div>
    );
  }
  return (
    <form onSubmit={send}>
      <div className="field">
        <label htmlFor="rm-reason">סיבה (לא חובה)</label>
        <textarea id="rm-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="למשל: כבר לא בתפקיד, או פשוט לא רוצה להופיע" />
      </div>
      <div className="field">
        <label htmlFor="rm-contact">איך לחזור אליכם (לא חובה)</label>
        <p className="hint">רק אם רוצים אישור כשההסרה הושלמה. לא מתפרסם.</p>
        <input id="rm-contact" type="text" dir="auto" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="מייל או טלפון" />
      </div>
      <label className="check field">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        <span>זה אני, או שאני פונה בשם האדם הזה.</span>
      </label>
      {state.error && (
        <div className="notice err" role="alert" style={{ marginBlockEnd: 16 }}>
          {state.error}
          {email && <> אפשר גם לכתוב ל־<a href={`mailto:${email}`} className="ltr">{email}</a>.</>}
        </div>
      )}
      <button className="btn primary" disabled={!confirm || state.busy}>
        {state.busy ? <span className="spinner" aria-hidden /> : null}
        שליחת בקשה
      </button>
    </form>
  );
}
