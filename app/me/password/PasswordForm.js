"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { authErrorHe, MIN_PASSWORD } from "@/lib/authErrors";

// New password twice, then supabase.auth.updateUser for the signed-in account.
export default function PasswordForm() {
  const { supabase } = useSupabase();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) { setState("error"); setError(`הסיסמה קצרה מדי. בחרו סיסמה של ${MIN_PASSWORD} תווים לפחות.`); return; }
    if (password !== again) { setState("error"); setError("הסיסמאות לא זהות. כתבו אותה שוב."); return; }
    setState("saving");
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password }).catch((x) => ({ error: x }));
    if (err) { setState("error"); setError(authErrorHe(err)); return; }
    setState("saved");
  }

  if (state === "saved") {
    return (
      <div className="stack">
        <p className="notice ok" role="status"><b>הסיסמה נשמרה.</b> מעכשיו נכנסים עם המייל והסיסמה.</p>
        <div className="row"><a className="btn primary" href="/me">לחשבון שלי</a></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="stack">
      <div>
        <label htmlFor="new-password">סיסמה חדשה</label>
        <input id="new-password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="small muted field-hint">{MIN_PASSWORD} תווים לפחות.</p>
      </div>
      <div>
        <label htmlFor="new-password-2">שוב, לאימות</label>
        <input id="new-password-2" type="password" required autoComplete="new-password" dir="ltr" value={again} onChange={(e) => setAgain(e.target.value)} />
      </div>
      {state === "error" && <div className="notice err" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "saving" || !password || !again}>
          {state === "saving" ? <span className="spinner" aria-hidden /> : null}
          שמירת הסיסמה
        </button>
      </div>
    </form>
  );
}
