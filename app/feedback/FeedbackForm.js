"use client";
import { useState } from "react";
import { track } from "@vercel/analytics";

const MAX = 1000;
const ERR = {
  empty: "צריך לכתוב לפחות כמה מילים.",
  bad_email: "כתובת המייל לא נראית תקינה. אפשר גם להשאיר את השדה ריק.",
  rate_limited: "נשלחו כבר כמה הערות מהמכשיר הזה. אפשר לנסות שוב בעוד כמה דקות.",
  not_configured: "שליחת הערות לא זמינה כרגע.",
};

export default function FeedbackForm({ ready, from }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ busy: false, done: false, error: "" });

  if (!ready) return <p className="notice" role="status">שליחת הערות לא זמינה כרגע.</p>;
  if (state.done) {
    return (
      <div className="notice ok" role="status">
        <b>תודה, ההערה התקבלה.</b> {email ? "אם יהיו שאלות, נחזור אליכם למייל שהשארתם." : "נקרא אותה בימים הקרובים."}
      </div>
    );
  }

  async function send(e) {
    e.preventDefault();
    if (state.busy) return;
    setState({ busy: true, done: false, error: "" });
    const page = from ? `/${from}` : "/feedback";
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, email: email.trim() || undefined, page }),
    }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      try { track("feedback_submit", from ? { where: from } : undefined); } catch {}
      setState({ busy: false, done: true, error: "" });
    } else {
      setState({ busy: false, done: false, error: ERR[out.error] || "השליחה נכשלה. מה שכתבתם נשאר כאן, אפשר לנסות שוב." });
    }
  }

  return (
    <form className="card stack" onSubmit={send}>
      <div className="field">
        <label htmlFor="fb-message">מה חסר, או מה לשפר?</label>
        <textarea id="fb-message" required maxLength={MAX} rows={5} dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="למשל: הייתי רוצה לראות גם מכרזים של עיריות קטנות" />
        <p className="hint">{message.length}/{MAX}</p>
      </div>
      <div className="field">
        <label htmlFor="fb-email">מייל (לא חובה)</label>
        <p className="hint">רק אם רוצים שנחזור אליכם. לא נרשמים בזה לשום רשימה.</p>
        <input id="fb-email" type="email" dir="ltr" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </div>
      {state.error && <div className="notice err" role="alert">{state.error}</div>}
      <div>
        <button className="btn primary" disabled={state.busy || message.trim().length < 2}>
          {state.busy ? <span className="spinner" aria-hidden /> : null}
          שליחה
        </button>
      </div>
    </form>
  );
}
