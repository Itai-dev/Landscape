"use client";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { CraftIcon } from "@/components/Icons";
import EditionCard from "@/components/EditionCard";
import DigestSubscribe from "@/components/DigestSubscribe";
import { firstSendLabel } from "@/lib/digestSchedule";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
];
const STEPS = 3; // crafts, preview, address (the "sent" screen comes after)
const FIRST = 12; // crafts shown before "עוד תחומים"

const tryTrack = (name, props) => { try { track(name, props); } catch {} };

// Three short screens on one page, no reloads. Each step is a history entry, so the phone's back
// gesture goes back a step. Consent and the address go through DigestSubscribe (the magic link carries
// the crafts and frequency; nothing is saved until the address is confirmed).
export default function JoinFlow({ crafts: all }) {
  const [step, setStep] = useState(0);
  const [crafts, setCrafts] = useState([]);
  const [frequency, setFrequency] = useState("weekly");
  const [more, setMore] = useState(false);
  const [ed, setEd] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const head = useRef(null);

  // Steps as history entries.
  useEffect(() => {
    const onPop = (e) => setStep(Number.isInteger(e.state?.joinStep) ? e.state.joinStep : 0);
    window.history.replaceState({ ...(window.history.state || {}), joinStep: 0 }, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (n) => {
    setStep(n);
    try { window.history.pushState({ ...(window.history.state || {}), joinStep: n }, ""); } catch {}
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    head.current?.focus({ preventScroll: true });
  }, [step]);

  // The preview follows the chosen crafts and frequency.
  useEffect(() => {
    if (step !== 1) return;
    let live = true;
    setBusy(true);
    const q = new URLSearchParams({ crafts: crafts.join(","), frequency });
    fetch(`/api/digest/preview?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j) setEd(j); })
      .catch(() => {})
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [step, crafts, frequency]);

  const toggle = (slug) => setCrafts((c) => (c.includes(slug) ? c.filter((x) => x !== slug) : [...c, slug]));
  const names = crafts.map((s) => all.find((c) => c.slug === s)?.he || s);
  const freqHe = FREQS.find((f) => f.slug === frequency)?.he;
  const shown = more ? all : all.slice(0, FIRST);
  const back = () => window.history.back();

  return (
    <div className="joinflow">
      <div className="wrap jwrap">
        {step < STEPS && (
          <div className="jtop">
            {step > 0 ? (
              <button type="button" className="jback" onClick={back}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                חזרה
              </button>
            ) : <a className="jback" href="/">ביטול</a>}
            <ol className="jdots" aria-label={`שלב ${step + 1} מתוך ${STEPS}`}>
              {Array.from({ length: STEPS }, (_, i) => <li key={i} className={i === step ? "on" : i < step ? "done" : ""} aria-hidden="true" />)}
            </ol>
          </div>
        )}

        {step === 0 && (
          <section className="jstep" aria-labelledby="j0">
            <h1 id="j0" ref={head} tabIndex={-1}>מה אתם עושים?</h1>
            <p className="muted">אפשר לבחור כמה. המייל יתמקד במה שבחרתם, ומי שמזמין את זה יופיע ראשון.</p>
            <div className="jcrafts" role="group" aria-label="תחומים">
              {shown.map((c) => (
                <button key={c.slug} type="button" className="jcraft" aria-pressed={crafts.includes(c.slug)} onClick={() => toggle(c.slug)}>
                  <CraftIcon craft={c.slug} size={24} />
                  <span>{c.he}</span>
                </button>
              ))}
            </div>
            {!more && all.length > FIRST && (
              <button type="button" className="tap jmore" onClick={() => setMore(true)}>עוד {all.length - FIRST} תחומים</button>
            )}
            <div className="jfoot">
              <button type="button" className="btn primary lg" onClick={() => { tryTrack("join_step_crafts", { crafts: crafts.length }); go(1); }}>
                {crafts.length ? `המשך (${crafts.length})` : "המשך"}
              </button>
              {!crafts.length && (
                <button type="button" className="tap jskip" onClick={() => { tryTrack("join_step_crafts", { crafts: 0, skipped: true }); go(1); }}>דלגו, כל התחומים</button>
              )}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="jstep" aria-labelledby="j1">
            <h1 id="j1" ref={head} tabIndex={-1}>ככה ייראה המייל שלכם</h1>
            <p className="muted">{names.length ? `מהדורה אמיתית של השבוע, ל${names.slice(0, 3).join(", ")}${names.length > 3 ? " ועוד" : ""}.` : "מהדורה אמיתית של השבוע, מכל התחומים."}</p>
            <div className="jfreq">
              <span className="label">כל כמה זמן?</span>
              <div className="chips" role="radiogroup" aria-label="תדירות">
                {FREQS.map((f) => (
                  <label key={f.slug} className={`chip${frequency === f.slug ? " on" : ""}`}>
                    <input type="radio" name="join-freq" checked={frequency === f.slug} onChange={() => setFrequency(f.slug)} />
                    {f.he}
                  </label>
                ))}
              </div>
            </div>
            <div aria-live="polite"><EditionCard ed={ed} busy={busy} /></div>
            <div className="jfoot">
              <button type="button" className="btn primary lg" onClick={() => { tryTrack("join_step_preview", { frequency }); go(2); }}>זה מתאים, להמשיך</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="jstep" aria-labelledby="j2">
            <h1 id="j2" ref={head} tabIndex={-1}>לאן לשלוח?</h1>
            <p className="muted">{names.length ? names.slice(0, 3).join(", ") + (names.length > 3 ? ` ועוד ${names.length - 3}` : "") : "כל התחומים"} · {freqHe}. אין סיסמה: שולחים קישור לאישור הכתובת.</p>
            <DigestSubscribe id="join" compact crafts={crafts} frequency={frequency} where="join" event="join_submit"
              cta="שלחו לי קישור לאישור" note="עד מייל אחד בשבוע. הסרה בלחיצה."
              onSent={(e) => { setEmail(e); go(3); }} />
          </section>
        )}

        {step === 3 && (
          <section className="jstep jsent" aria-labelledby="j3">
            <div className="jicon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            </div>
            <h1 id="j3" ref={head} tabIndex={-1}>שלחנו קישור</h1>
            <p>שלחנו קישור אישור ל־<b className="ltr">{email}</b>. לוחצים עליו, והמייל הראשון יגיע {firstSendLabel(frequency)}.</p>
            <p className="notice">הקישור עובד רק במכשיר ובדפדפן האלה. כדאי לפתוח את המייל כאן.</p>
            <p className="muted small">לא הגיע תוך כמה דקות? כדאי לבדוק בספאם או בקידומי מכירות.</p>
            <p className="small"><a className="tap" href="/feedback?from=join" data-track="feedback_open" data-track-where="join_sent">משהו חסר? יש רעיון לשיפור?</a></p>
            <div className="jfoot">
              <a className="btn primary lg" href="/digest">בינתיים, לעדכוני השבוע</a>
              <button type="button" className="tap jskip" onClick={() => go(2)}>כתובת אחרת? לשלוח שוב</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
