"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { CONSENT_TEXT } from "@/lib/taxonomy";

// Email magic link. New people get an account; returning people just sign in.
// The newsletter box starts unchecked: explicit opt-in (Israeli anti-spam law).
export default function SignupForm({ next = "/onboard", compact = false }) {
  const { supabase, configured } = useSupabase();
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  if (!configured) {
    return <div className="notice">ההרשמה נפתחת בקרוב. בינתיים אפשר לעבור על <a href="/companies">החברות</a> ועל <a href="/people">האנשים</a> במאגר.</div>;
  }
  if (state === "sent") {
    return (
      <div className="notice ok" role="status">
        <b>שלחנו קישור כניסה ל־<span className="ltr">{email}</span>.</b>
        <br />
        פתחו אותו באותו דפדפן כדי להמשיך. לא הגיע? בדקו בספאם או נסו שוב בעוד דקה.
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: { newsletter_opt_in: newsletter, consent_text: newsletter ? CONSENT_TEXT : null },
      },
    });
    if (error) {
      setState("error");
      setError(/rate|limit/i.test(error.message) ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." : "משהו השתבש. בדקו את הכתובת ונסו שוב.");
    } else setState("sent");
  }

  return (
    <form onSubmit={submit} className="stack" noValidate={false}>
      <div>
        <label htmlFor="email">מייל</label>
        <input id="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
        <span>{CONSENT_TEXT}</span>
      </label>
      {state === "error" && <div className="notice err" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "sending" || !email.includes("@")}>
          {state === "sending" ? <span className="spinner" aria-hidden /> : null}
          שלחו לי קישור כניסה
        </button>
        <span className="small muted">בלי סיסמה: נכנסים עם קישור במייל.</span>
      </div>
      <p className="small muted">
        ההרשמה כפופה ל<a href="/privacy">מדיניות הפרטיות</a>. הפרופיל לא מתפרסם בלי אישור.
      </p>
    </form>
  );
}
