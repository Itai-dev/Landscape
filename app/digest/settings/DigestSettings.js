"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import DigestSubscribe from "@/components/DigestSubscribe";
import { firstSendLabel } from "@/lib/digestSchedule";
import { CRAFTS, CONSENT_TEXT } from "@/lib/taxonomy";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
  { slug: "off", he: "בלי מייל" },
];

// After the magic link (?welcome=1) the choices made on the form are already saved (by /auth/callback,
// once the link confirmed the address). Here the reader sees and edits them.
export default function DigestSettings() {
  const { configured } = useSupabase();
  const user = useUser();
  const welcome = useSearchParams().get("welcome") === "1";
  const [prefs, setPrefs] = useState(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/digest/prefs", { cache: "no-store" });
        if (res.ok) setPrefs((await res.json()).prefs);
        else setState("error");
      } catch {
        setState("error");
      }
    })();
  }, [user]);

  if (!configured) return <div className="soon"><h3>ההרשמה במייל נפתחת בקרוב</h3><p>בינתיים ״השבוע בתעשייה״ מתעדכן באתר כל שבוע.</p><a className="btn" href="/digest">לעדכוני השבוע</a></div>;
  if (user === undefined) return <p className="center muted"><span className="spinner" aria-hidden /> טוענים…</p>;
  if (!user) {
    return (
      <div className="panel stack">
        <h2>הירשמו לניוזלטר</h2>
        <p className="muted">משאירים מייל ומאשרים בקישור. מי שכבר רשום יקבל קישור כניסה לשינוי ההגדרות.</p>
        <DigestSubscribe />
      </div>
    );
  }
  if (!prefs) return state === "error" ? <div className="notice err">לא הצלחנו לטעון את ההגדרות. רעננו את הדף.</div> : <p className="center muted"><span className="spinner" aria-hidden /> טוענים…</p>;

  const on = prefs.frequency !== "off";
  const needsConsent = on && !prefs.consent_at;
  const toggle = (slug) => setPrefs({ ...prefs, crafts: prefs.crafts.includes(slug) ? prefs.crafts.filter((c) => c !== slug) : [...prefs.crafts, slug] });

  async function save(e) {
    e.preventDefault();
    setState("saving");
    let res;
    try {
      res = await fetch("/api/digest/prefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frequency: prefs.frequency, crafts: prefs.crafts, consent }),
      });
    } catch {
      setSaveError("אין חיבור כרגע. נסו שוב.");
      setState("error");
      return;
    }
    if (res.ok) {
      const j = await res.json();
      // Switching the email off withdraws consent; switching it on again asks for it again.
      setPrefs({ ...prefs, ...j, consent_at: j.frequency === "off" ? null : prefs.consent_at || new Date().toISOString() });
      setConsent(false);
      setState("saved");
    } else {
      const j = await res.json().catch(() => ({}));
      setSaveError(j.error === "consent_required" ? "כדי לקבל את הניוזלטר, סמנו את האישור." : res.status === 429 ? "יותר מדי שמירות ברצף. נסו שוב בעוד כמה דקות." : "לא הצלחנו לשמור. נסו שוב.");
      setState("error");
    }
  }

  const preview = `/digest${prefs.crafts.length ? `?crafts=${prefs.crafts.join(",")}` : ""}`;
  return (
    <form className="stack digest-form" onSubmit={save}>
      {welcome && on && state === "idle" && (
        <div className="notice ok" role="status"><b>נרשמתם.</b> המייל הראשון יגיע {firstSendLabel(prefs.frequency)} ל־<span className="ltr">{user.email}</span>.</div>
      )}
      {welcome && !on && state === "idle" && (
        <div className="notice" role="status">ההרשמה לא הושלמה. בוחרים תדירות ושומרים.</div>
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
          <span className="label">תחומים <span className="muted small">(בלי בחירה מקבלים את כל התחומים)</span></span>
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
      {state === "error" && <div className="notice err" role="alert">{saveError || "לא הצלחנו לשמור. נסו שוב."}</div>}
      {state === "saved" && <div className="notice ok" role="status">נשמר.</div>}
      <div className="row">
        <button className="btn primary" disabled={state === "saving" || (needsConsent && !consent)}>
          {state === "saving" ? <span className="spinner" aria-hidden /> : null}
          שמירת ההגדרות
        </button>
        <a className="btn" href={preview}>לתצוגה מקדימה של המייל</a>
      </div>
    </form>
  );
}
