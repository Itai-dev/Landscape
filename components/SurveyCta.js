"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import SignupForm from "@/components/SignupForm";
import ComingSoon from "@/components/ComingSoon";

// The survey's call to action: sign in with email, then start, continue or edit.
export default function SurveyCta({ open = true }) {
  const { configured } = useSupabase();
  const user = useUser();
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/survey", { cache: "no-store" }).then((r) => r.json()).then(setState).catch(() => setState({}));
  }, [user]);

  if (!configured) {
    return <ComingSoon title="הסקר נפתח בקרוב" text="ההרשמה לאתר עוד לא פתוחה. בינתיים אפשר לעבור על החברות והאנשים במאגר." />;
  }
  if (!open) {
    return (
      <div className="soon">
        <h3>הסקר נסגר</h3>
        <p>תודה לכל מי שענה. התוצאות פתוחות לכולם.</p>
        <a className="btn primary" href="/survey/results">לתוצאות</a>
      </div>
    );
  }
  if (user === undefined || (user && !state)) {
    return <div className="soon" aria-busy="true"><span className="spinner" aria-hidden /><p>רגע…</p></div>;
  }
  if (!user) {
    return (
      <div className="card stack survey-signin">
        <h3>נכנסים עם המייל ומתחילים</h3>
        <p className="muted small">בלי סיסמה: שולחים לכם קישור כניסה, והסקר נפתח מיד אחריו. התשובה אחת לכל חשבון, ואפשר לעדכן אותה עד סגירת הסקר.</p>
        <SignupForm next="/survey/start" />
      </div>
    );
  }
  if (state?.completed) {
    return (
      <div className="soon">
        <h3>עניתם על הסקר. תודה!</h3>
        <p>התוצאות פתוחות לכם כבר עכשיו, ואפשר לעדכן תשובות עד סגירת הסקר.</p>
        <div className="row center">
          <a className="btn primary" href="/survey/results">לתוצאות</a>
          <a className="btn" href="/survey/start">עדכון התשובות</a>
        </div>
      </div>
    );
  }
  const draft = state?.response && !state.response.completed;
  return (
    <div className="soon">
      <h3>{draft ? "התחלתם לענות" : "מוכנים? זה לוקח בערך 4 דקות"}</h3>
      <p>{draft ? "התשובות נשמרו. ממשיכים מאיפה שעצרתם." : "כמה שאלות קצרות בכל מסך, ואפשר לעצור ולהמשיך אחר כך."}</p>
      <a className="btn primary lg" href="/survey/start">{draft ? "להמשיך בסקר" : "להתחיל את הסקר"}</a>
    </div>
  );
}
