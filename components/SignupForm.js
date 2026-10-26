"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { CONSENT_TEXT } from "@/lib/taxonomy";
import { callbackUrl, normalEmail, validEmail } from "@/lib/authLink";
import { authErrorHe } from "@/lib/authErrors";
import OAuthButtons from "@/components/OAuthButtons";
import { firstSendLabel } from "@/lib/digestSchedule";
import ComingSoon from "@/components/ComingSoon";
import { PROFILES } from "@/lib/chrome.mjs";

// Sign-in: email and password by default, with "forgot password" (a reset link that lands on /me/password),
// or a one-time sign-in link by email (new people get an account that way too). The digest box starts
// unchecked: explicit opt-in (Israeli anti-spam law), confirmed by opening the link.
export default function SignupForm({ next = PROFILES ? "/onboard" : "/digest/settings", digest = true }) {
  const { supabase, configured } = useSupabase();
  const [mode, setMode] = useState("password"); // password | link
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | reset | error
  const [error, setError] = useState("");

  if (!configured) {
    return <ComingSoon />;
  }
  if (state === "sent" || state === "reset") {
    return (
      <div className="notice ok" role="status">
        <b>{state === "reset" ? "שלחנו קישור לבחירת סיסמה חדשה ל־" : "שלחנו קישור כניסה ל־"}<span className="ltr">{email}</span>.</b>
        <br />
        {state === "sent" && newsletter ? `הלחיצה עליו מאשרת גם את ההרשמה ל״השבוע בתעשייה״, והמייל הראשון יגיע ${firstSendLabel("weekly")}. ` : ""}
        פתחו אותו באותו מכשיר ובאותו דפדפן. לא הגיע? בדקו בספאם.
      </div>
    );
  }

  const fail = (err) => { setState("error"); setError(authErrorHe(err)); };
  const address = () => normalEmail(email);

  async function submit(e) {
    e.preventDefault();
    if (!validEmail(address())) { setState("error"); setError("הכתובת לא נראית תקינה. בדקו אותה."); return; }
    setState("sending");
    setError("");
    if (mode === "password") {
      const { error: err } = await supabase.auth.signInWithPassword({ email: address(), password }).catch((x) => ({ error: x }));
      if (err) return fail(err);
      window.location.assign(next);
      return;
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address(),
      options: { emailRedirectTo: callbackUrl({ next, subscribe: newsletter ? "weekly" : "" }) },
    }).catch((x) => ({ error: x }));
    if (err) fail(err); else setState("sent");
  }

  async function forgot() {
    if (!validEmail(address())) { setState("error"); setError("כתבו קודם את כתובת המייל שלכם, ואז לחצו שוב."); return; }
    setState("sending");
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(address(), { redirectTo: callbackUrl({ next: "/me/password?reset=1" }) })
      .catch((x) => ({ error: x }));
    if (err) fail(err); else setState("reset");
  }

  const toggle = () => { setMode(mode === "password" ? "link" : "password"); setState("idle"); setError(""); };

  return (
    <form onSubmit={submit} className="stack" noValidate={false}>
      {digest && mode === "link" && (
        <label className="check">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>{CONSENT_TEXT}</span>
        </label>
      )}
      <OAuthButtons where="signin" redirectTo={() => callbackUrl({ next, subscribe: newsletter ? "weekly" : "" })} />
      <div>
        <label htmlFor="email">מייל</label>
        <input id="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {mode === "password" && (
        <div>
          <label htmlFor="password">סיסמה</label>
          <input id="password" type="password" required autoComplete="current-password" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="tap linkbtn small" onClick={forgot}>שכחתם את הסיסמה?</button>
        </div>
      )}
      {state === "error" && <div className="notice err" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "sending" || !email.includes("@") || (mode === "password" && !password)}>
          {state === "sending" ? <span className="spinner" aria-hidden /> : null}
          {mode === "password" ? "כניסה" : "שלחו לי קישור כניסה"}
        </button>
        <button type="button" className="tap linkbtn small" onClick={toggle}>
          {mode === "password" ? "בלי סיסמה? קבלו קישור כניסה במייל" : "יש לכם סיסמה? היכנסו איתה"}
        </button>
      </div>
      <p className="small muted">
        ההרשמה כפופה ל<a href="/privacy">מדיניות הפרטיות</a>.{PROFILES ? " הפרופיל לא מתפרסם בלי אישור." : ""}
      </p>
    </form>
  );
}
