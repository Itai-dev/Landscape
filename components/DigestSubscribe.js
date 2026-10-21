"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import { CRAFTS, CONSENT_TEXT } from "@/lib/taxonomy";
import { callbackUrl } from "@/lib/authLink";
import { firstSendLabel } from "@/lib/digestSchedule";
import { track } from "@vercel/analytics";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
];

function Chips({ options, value, onChange, name }) {
  const toggle = (slug) => onChange(value.includes(slug) ? value.filter((v) => v !== slug) : [...value, slug]);
  return (
    <div className="chips" role="group" aria-label={name}>
      {options.map((o) => (
        <label key={o.slug} className={`chip${value.includes(o.slug) ? " on" : ""}`}>
          <input type="checkbox" checked={value.includes(o.slug)} onChange={() => toggle(o.slug)} />
          {o.he}
        </label>
      ))}
    </div>
  );
}

const label = (slugs) => slugs.map((s) => CRAFTS.find((c) => c.slug === s)?.he || s).join(", ");

// Email-only sign-up for the digest. The consent box starts unchecked (anti-spam law §30A): nothing is sent
// without it, and nothing is sent until the address is confirmed by opening the link in the email.
// Signed-in readers (already confirmed) save straight away.
// `onSent(email)` lets a flow (/join) show its own "sent" screen; `event` is an extra analytics event on submit.
export default function DigestSubscribe({ crafts: initialCrafts = [], frequency: initialFrequency = "weekly", compact = false, id = "subscribe", cta = "", note = "", where = "", onSent = null, event = "" }) {
  const { supabase, configured } = useSupabase();
  const user = useUser();
  const [email, setEmail] = useState("");
  const [crafts, setCrafts] = useState(initialCrafts);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | saved | error
  const [error, setError] = useState("");

  if (!configured) {
    return <p className="muted small">ההרשמה במייל נפתחת בקרוב. בינתיים ״השבוע בתעשייה״ מתעדכן כאן כל שבוע.</p>;
  }
  if (state === "sent") {
    return (
      <div className="notice ok" role="status">
        <b>כמעט סיימנו: שלחנו קישור אישור ל־<span className="ltr">{email}</span>.</b>
        <br />
        לוחצים עליו כדי לאשר, והמייל הראשון יגיע {firstSendLabel(frequency)}: מינויים, החלפות משרד, משרות ומכרזים, ומי מזמין את מה שאתם עושים. אחרי האישור אפשר לבחור תחומים. הקישור עובד רק במכשיר ובדפדפן האלה. לא הגיע? כדאי לבדוק בספאם.
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div className="notice ok" role="status">
        <b>נרשמתם. המייל הראשון יגיע {firstSendLabel(frequency)}.</b> אפשר לשנות תחומים ותדירות בכל רגע <a href="/digest/settings">כאן</a>.
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!consent) return;
    try { track("digest_subscribe_submit", { where: where || id }); if (event) track(event, { crafts: crafts.length, frequency }); } catch {}
    setState("sending");
    setError("");
    if (user) {
      const res = await fetch("/api/digest/prefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ frequency, crafts, consent: true }) });
      if (res.ok) setState("saved");
      else { setState("error"); setError("לא הצלחנו לשמור. אפשר לנסות שוב."); }
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl({ next: "/digest/settings?welcome=1", subscribe: frequency, crafts }) },
    });
    if (error) {
      setState("error");
      setError(/rate|limit/i.test(error.message) ? "יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות." : "משהו השתבש. כדאי לבדוק את הכתובת ולנסות שוב.");
    } else if (onSent) {
      setState("idle");
      onSent(email.trim());
    } else setState("sent");
  }

  return (
    <form id={id} onSubmit={submit} className="stack digest-form">
      {!user && (
        <div>
          <label htmlFor={`${id}-email`}>מייל</label>
          <input id={`${id}-email`} type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      )}
      {!compact && (
        <>
          <details className="craft-pick">
            <summary>
              <span className="label">התחומים שלכם</span>{" "}
              <span className="muted small">{crafts.length ? label(crafts) : "כל התחומים"}</span>{" "}
              <span className="change">שינוי תחומים</span>
            </summary>
            <Chips name="תחומים" options={CRAFTS} value={crafts} onChange={setCrafts} />
          </details>
          <div>
            <span className="label">תדירות</span>
            <div className="chips" role="radiogroup" aria-label="תדירות">
              {FREQS.map((f) => (
                <label key={f.slug} className={`chip${frequency === f.slug ? " on" : ""}`}>
                  <input type="radio" name={`${id}-freq`} checked={frequency === f.slug} onChange={() => setFrequency(f.slug)} />
                  {f.he}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>{CONSENT_TEXT}</span>
      </label>
      {state === "error" && <div className="notice err" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "sending" || !consent || (!user && !email.includes("@"))}>
          {state === "sending" ? <span className="spinner" aria-hidden /> : null}
          {cta || (user ? "להירשם למייל השבועי" : "שלחו לי את המייל של יום ראשון")}
        </button>
        <span className="small muted">{note || "עד מייל אחד בשבוע. הסרה בלחיצה. בלי סיסמה."}</span>
      </div>
    </form>
  );
}
