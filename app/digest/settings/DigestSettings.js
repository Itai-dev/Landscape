"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import DigestSubscribe, { PENDING_KEY } from "@/components/DigestSubscribe";
import { CRAFTS, CONSENT_TEXT } from "@/lib/taxonomy";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
  { slug: "off", he: "בלי מייל" },
];

// After the magic link (?welcome=1): saves the choices made on the form, then lets the reader edit them.
export default function DigestSettings() {
  const { configured } = useSupabase();
  const user = useUser();
  const welcome = useSearchParams().get("welcome") === "1";
  const [prefs, setPrefs] = useState(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let pending = null;
      try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch {}
      if (pending && Date.now() - (pending.at || 0) < 7 * 864e5) {
        const res = await fetch("/api/digest/prefs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ frequency: pending.frequency, crafts: pending.crafts, consent: true }),
        });
        if (res.ok) setJoined(true);
      }
      try { localStorage.removeItem(PENDING_KEY); } catch {}
      const res = await fetch("/api/digest/prefs");
      if (res.ok) setPrefs((await res.json()).prefs);
      else setState("error");
    })();
  }, [user]);

  if (!configured) return <div className="soon"><h3>ההרשמה במייל נפתחת בקרוב</h3><p>בינתיים הגיליון מתעדכן באתר כל שבוע.</p><a className="btn" href="/digest">לגיליון</a></div>;
  if (user === undefined) return <p className="center muted"><span className="spinner" aria-hidden /> טוען…</p>;
  if (!user) {
    return (
      <div className="panel stack">
        <h2>להירשם לגיליון</h2>
        <p className="muted">משאירים מייל ומאשרים בקישור. מי שכבר רשום יקבל קישור כניסה לשינוי ההגדרות.</p>
        <DigestSubscribe />
      </div>
    );
  }
  if (!prefs) return state === "error" ? <div className="notice err">לא הצלחנו לטעון את ההגדרות. אפשר לרענן.</div> : <p className="center muted"><span className="spinner" aria-hidden /> טוען…</p>;

  const on = prefs.frequency !== "off";
  const needsConsent = on && !prefs.consent_at;
  const toggle = (slug) => setPrefs({ ...prefs, crafts: prefs.crafts.includes(slug) ? prefs.crafts.filter((c) => c !== slug) : [...prefs.crafts, slug] });

  async function save(e) {
    e.preventDefault();
    setState("saving");
    const res = await fetch("/api/digest/prefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ frequency: prefs.frequency, crafts: prefs.crafts, consent }),
    });
    if (res.ok) {
      const j = await res.json();
      setPrefs({ ...prefs, ...j, consent_at: prefs.consent_at || (j.frequency !== "off" ? new Date().toISOString() : null) });
      setState("saved");
    } else setState("error");
  }

  const preview = `/digest${prefs.crafts.length ? `?crafts=${prefs.crafts.join(",")}` : ""}`;
  return (
    <form className="stack digest-form" onSubmit={save}>
      {(welcome || joined) && on && (
        <div className="notice ok" role="status"><b>נרשמתם לגיליון.</b> הגיליון הבא יגיע ביום ראשון בבוקר ל־<span className="ltr">{user.email}</span>.</div>
      )}
      <div className="card stack">
        <div>
          <span className="label">תדירות</span>
          <div className="chips" role="radiogroup" aria-label="תדירות">
            {FREQS.map((f) => (
              <label key={f.slug} className={`chip${prefs.frequency === f.slug ? " on" : ""}`}>
                <input type="radio" name="freq" checked={prefs.frequency === f.slug} onChange={() => setPrefs({ ...prefs, frequency: f.slug })} />
                {f.he}
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="label">תחומים <span className="muted small">(בלי בחירה מקבלים את הגיליון הכללי)</span></span>
          <div className="chips" role="group" aria-label="תחומים">
            {CRAFTS.map((c) => (
              <label key={c.slug} className={`chip${prefs.crafts.includes(c.slug) ? " on" : ""}`}>
                <input type="checkbox" checked={prefs.crafts.includes(c.slug)} onChange={() => toggle(c.slug)} />
                {c.he}
              </label>
            ))}
          </div>
        </div>
        {needsConsent && (
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span>{CONSENT_TEXT}</span>
          </label>
        )}
      </div>
      {state === "error" && <div className="notice err" role="alert">לא הצלחנו לשמור. אפשר לנסות שוב.</div>}
      {state === "saved" && <div className="notice ok" role="status">נשמר.</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "saving" || (needsConsent && !consent)}>
          {state === "saving" ? <span className="spinner" aria-hidden /> : null}
          שמירה
        </button>
        <a className="btn" href={preview}>לראות את הגיליון שלי</a>
      </div>
    </form>
  );
}
