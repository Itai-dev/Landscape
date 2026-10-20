"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import { CRAFTS, CONSENT_TEXT } from "@/lib/taxonomy";
import { callbackUrl } from "@/lib/authLink";
import { firstSendLabel } from "@/lib/digestSchedule";

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
export default function DigestSubscribe({ crafts: initialCrafts = [], compact = false, id = "subscribe" }) {
  const { supabase, configured } = useSupabase();
  const user = useUser();
  const [email, setEmail] = useState("");
  const [crafts, setCrafts] = useState(initialCrafts);
  const [frequency, setFrequency] = useState("weekly");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | saved | error
  const [error, setError] = useState("");

  if (!configured) {
    return <p className="muted small">ההרשמה במייל נפתחת בקרוב. בינתיים הגיליון מתעדכן כאן כל שבוע.</p>;
  }
  if (state === "sent") {
    return (
      <div className="notice ok" role="status">
        <b>כמעט סיימנו: שלחנו קישור אישור ל־<span className="ltr">{email}</span>.</b>
        <br />
        לוחצים עליו כדי לאשר את ההרשמה, והגיליון הראשון יגיע {firstSendLabel(frequency)}. כדאי לפתוח אותו באותו מכשיר ובאותו דפדפן. לא הגיע? כדאי לבדוק בספאם.
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div className="notice ok" role="status">
        <b>נרשמתם. הגיליון הראשון יגיע {firstSendLabel(frequency)}.</b> אפשר לשנות תחומים ותדירות בכל רגע <a href="/digest/settings">כאן</a>.
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!consent) return;
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
              <span className="muted small">{crafts.length ? label(crafts) : "הגיליון הכללי"}</span>{" "}
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
          {user ? "להירשם לגיליון" : "לקבל את הגיליון במייל"}
        </button>
        <span className="small muted">חינם. בלי סיסמה. אפשר להסיר בכל רגע.</span>
      </div>
    </form>
  );
}
