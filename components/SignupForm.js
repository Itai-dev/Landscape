"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { CONSENT_TEXT } from "@/lib/taxonomy";
import { callbackUrl } from "@/lib/authLink";
import { firstSendLabel } from "@/lib/digestSchedule";
import ComingSoon from "@/components/ComingSoon";
import { PROFILES } from "@/lib/chrome.mjs";

// Email magic link. New people get an account; returning people just sign in.
// The digest box starts unchecked: explicit opt-in (Israeli anti-spam law), confirmed by opening the link.
export default function SignupForm({ next = PROFILES ? "/onboard" : "/digest/settings", digest = true }) {
  const { supabase, configured } = useSupabase();
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  if (!configured) {
    return <ComingSoon />;
  }
  if (state === "sent") {
    return (
      <div className="notice ok" role="status">
        <b>שלחנו קישור אישור ל־<span className="ltr">{email}</span>.</b>
        <br />
        {newsletter ? `הלחיצה עליו מאשרת גם את ההרשמה ל״השבוע בתעשייה״, והמייל הראשון יגיע ${firstSendLabel("weekly")}. ` : ""}
        כדאי לפתוח אותו באותו מכשיר ובאותו דפדפן. לא הגיע? כדאי לבדוק בספאם.
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl({ next, subscribe: newsletter ? "weekly" : "" }) },
    });
    if (error) {
      setState("error");
      setError(/rate|limit/i.test(error.message) ? "יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות." : "משהו השתבש. כדאי לבדוק את הכתובת ולנסות שוב.");
    } else setState("sent");
  }

  return (
    <form onSubmit={submit} className="stack" noValidate={false}>
      <div>
        <label htmlFor="email">מייל</label>
        <input id="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {digest && (
        <label className="check">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>{CONSENT_TEXT}</span>
        </label>
      )}
      {state === "error" && <div className="notice err" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "sending" || !email.includes("@")}>
          {state === "sending" ? <span className="spinner" aria-hidden /> : null}
          שלחו לי קישור כניסה
        </button>
        <span className="small muted">בלי סיסמה: נכנסים עם קישור במייל.</span>
      </div>
      <p className="small muted">
        ההרשמה כפופה ל<a href="/privacy">מדיניות הפרטיות</a>.{PROFILES ? " הפרופיל לא מתפרסם בלי אישור." : ""}
      </p>
    </form>
  );
}
