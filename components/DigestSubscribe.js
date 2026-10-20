"use client";
import { useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import { CRAFTS, CONSENT_TEXT } from "@/lib/taxonomy";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
];
export const PENDING_KEY = "landscape-digest-pending";

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

// Email-only sign-up for the digest. The consent box starts unchecked (anti-spam law §30A): nothing is sent
// without it. New readers confirm through the magic link; signed-in readers save straight away.
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
        לוחצים עליו באותו דפדפן, והגיליון הראשון יגיע ביום ראשון הקרוב. לא הגיע? כדאי לבדוק בספאם.
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div className="notice ok" role="status">
        <b>נרשמתם. הגיליון הבא יגיע ביום ראשון.</b> אפשר לשנות תחומים ותדירות בכל רגע <a href="/digest/settings">כאן</a>.
      </div>
    );
  }

  const choice = { crafts, frequency, consent_text: CONSENT_TEXT };

  async function submit(e) {
    e.preventDefault();
    if (!consent) return;
    setState("sending");
    setError("");
    if (user) {
      const res = await fetch("/api/digest/prefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...choice, consent: true }) });
      if (res.ok) setState("saved");
      else { setState("error"); setError("לא הצלחנו לשמור. אפשר לנסות שוב."); }
      return;
    }
    try { localStorage.setItem(PENDING_KEY, JSON.stringify({ ...choice, at: Date.now() })); } catch {}
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/digest/settings?welcome=1")}`,
        data: { newsletter_opt_in: true, consent_text: CONSENT_TEXT, newsletter_frequency: frequency, newsletter_crafts: crafts },
      },
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
          <div>
            <span className="label">התחומים שלכם <span className="muted small">(אפשר לדלג ולקבל את הגיליון הכללי)</span></span>
            <Chips name="תחומים" options={CRAFTS} value={crafts} onChange={setCrafts} />
          </div>
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
