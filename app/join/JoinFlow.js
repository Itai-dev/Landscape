"use client";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { CraftIcon } from "@/components/Icons";
import EditionCard from "@/components/EditionCard";
import { firstSendLabel } from "@/lib/digestSchedule";
import { useSupabase } from "@/components/Providers";
import { CONSENT_TEXT } from "@/lib/taxonomy";
import { callbackUrl, normalEmail, validEmail } from "@/lib/authLink";
import OAuthButtons from "@/components/OAuthButtons";
import { authErrorHe, MIN_PASSWORD } from "@/lib/authErrors";
import { OAUTH } from "@/lib/oauth";

const FREQS = [
  { slug: "weekly", he: "כל שבוע" },
  { slug: "biweekly", he: "כל שבועיים" },
  { slug: "monthly", he: "פעם בחודש" },
];
const STEPS = 3; // crafts, newsletter (yes / not now), address (the "sent" screen comes after)
const FIRST = 12; // crafts shown before "עוד תחומים"

const tryTrack = (name, props) => { try { track(name, props); } catch {} };

// Sign-up: three short screens on one page, no reloads (each step is a history entry, so the phone's back
// gesture goes back a step). It makes an account: crafts, then whether to get the newsletter too, then the
// address. The newsletter is optional; saying yes still needs the consent box ticked on the address step
// (unchecked by default, anti-spam law §30A). A sign-in link goes out; nothing is saved until it is opened
// (the link carries the crafts and, if chosen, the frequency), and it lands in the personal area (/me).
export default function JoinFlow({ crafts: all, source = "join" }) {
  const [step, setStep] = useState(0);
  const [crafts, setCrafts] = useState([]);
  const [frequency, setFrequency] = useState("weekly");
  const [more, setMore] = useState(false);
  const [ed, setEd] = useState(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | sending | error
  const [error, setError] = useState("");
  const { supabase, configured } = useSupabase();
  const head = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (newsletter && !consent) return;
    const address = normalEmail(email);
    if (!validEmail(address)) { setPhase("error"); setError("הכתובת לא נראית שלמה. בדקו אותה."); return; }
    if (password && password.length < MIN_PASSWORD) { setPhase("error"); setError(`הסיסמה קצרה מדי. בחרו סיסמה של ${MIN_PASSWORD} תווים לפחות, או השאירו את השדה ריק.`); return; }
    tryTrack("join_submit", { crafts: crafts.length, newsletter, frequency: newsletter ? frequency : "off", where: source });
    if (newsletter) tryTrack("digest_subscribe_submit", { where: source });
    setPhase("sending");
    setError("");
    let err;
    const emailRedirectTo = callbackUrl({ next: "/welcome", subscribe: newsletter ? frequency : "", crafts });
    try {
      if (password) {
        // With a password: an account confirmed once by email; later sign-ins use the password.
        const { data, error } = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo } });
        err = error;
        // An address that already has an account comes back with no identities, and no email is sent.
        if (!err && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setPhase("error"); setError("כבר יש חשבון עם הכתובת הזו. היכנסו עם הסיסמה או עם קישור במייל."); return;
        }
      } else {
        ({ error: err } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo } }));
      }
    } catch {
      setPhase("error"); setError("אין חיבור כרגע. נסו שוב בעוד רגע."); return;
    }
    if (err) {
      setPhase("error");
      setError(authErrorHe(err));
      return;
    }
    setPhase("idle");
    setEmail(address);
    go(3);
  }

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
            ) : <a className="jback" href="/">לדף הבית</a>}
            <ol className="jdots" aria-label={`שלב ${step + 1} מתוך ${STEPS}`}>
              {Array.from({ length: STEPS }, (_, i) => <li key={i} className={i === step ? "on" : i < step ? "done" : ""} aria-hidden="true" />)}
            </ol>
          </div>
        )}

        {step === 0 && (
          <section className="jstep" aria-labelledby="j0">
            <h1 id="j0" ref={head} tabIndex={-1}>באילו תחומים אתם עובדים?</h1>
            <p className="muted">בחרו אחד או יותר. לפי זה נבחר לכם את העדכונים, ומי שמזמין את התחומים האלה יופיע ראשון.</p>
            <div className="jcrafts" role="group" aria-label="תחומים">
              {shown.map((c) => (
                <button key={c.slug} type="button" className="jcraft" aria-pressed={crafts.includes(c.slug)} onClick={() => toggle(c.slug)}>
                  <CraftIcon craft={c.slug} size={24} />
                  <span>{c.he}</span>
                </button>
              ))}
            </div>
            {!more && all.length > FIRST && (
              <button type="button" className="tap jmore" onClick={() => setMore(true)}>לכל התחומים (עוד {all.length - FIRST})</button>
            )}
            <div className="jfoot">
              <button type="button" className="btn primary lg" onClick={() => { tryTrack("join_step_crafts", { crafts: crafts.length }); go(1); }}>
                {crafts.length === 1 ? "המשך עם תחום אחד" : crafts.length ? `המשך עם ${crafts.length} תחומים` : "המשך עם כל התחומים"}
              </button>
              {!crafts.length && <span className="small muted">לא בטוחים? אפשר לבחור גם אחר כך, מהחשבון.</span>}
            </div>
            <p className="small muted">כבר יש לכם חשבון? <a className="tap" href="/me">כניסה</a></p>
          </section>
        )}

        {step === 1 && (
          <section className="jstep" aria-labelledby="j1">
            <h1 id="j1" ref={head} tabIndex={-1}>רוצים לקבל את זה במייל?</h1>
            <p className="muted">{names.length ? `זה המייל השבועי כמו שהיה מגיע אליכם השבוע, ל${names.slice(0, 3).join(", ")}${names.length > 3 ? " ועוד" : ""}.` : "זה המייל השבועי כמו שהיה מגיע אליכם השבוע, מכל התחומים."} מייל אחד, ביום ראשון בבוקר. אפשר להפסיק בכל רגע.</p>
            <div className="jfreq">
              <span className="label">באיזו תדירות?</span>
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
              <button type="button" className="btn primary lg" onClick={() => { tryTrack("join_step_newsletter", { newsletter: true, frequency }); setNewsletter(true); go(2); }}>כן, שלחו לי</button>
              <button type="button" className="tap jskip" onClick={() => { tryTrack("join_step_newsletter", { newsletter: false }); setNewsletter(false); setConsent(false); go(2); }}>לא עכשיו, רק החשבון</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="jstep" aria-labelledby="j2">
            <h1 id="j2" ref={head} tabIndex={-1}>לאן לשלוח?</h1>
            <p className="muted">נשלח לכם קישור אחד לאישור הכתובת. אחרי הלחיצה עליו הכול מוכן: {newsletter ? `המייל השבועי (${freqHe}), ` : ""}המעקב אחרי חברות וההתראות.{OAUTH.length ? " אפשר גם עם Google." : ""}</p>
            {!configured ? (
              <p className="muted small">ההרשמה נפתחת בקרוב.</p>
            ) : (
              <form id="join" onSubmit={submit} className="stack digest-form">
                {newsletter && (
                  <label className="check">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                    <span>{CONSENT_TEXT}</span>
                  </label>
                )}
                <OAuthButtons
                  where="join"
                  disabled={newsletter && !consent}
                  redirectTo={() => callbackUrl({ next: "/welcome", subscribe: newsletter ? frequency : "", crafts })}
                  onStart={(provider) => {
                    tryTrack("join_submit", { crafts: crafts.length, newsletter, frequency: newsletter ? frequency : "off", method: provider, where: source });
                    if (newsletter) tryTrack("digest_subscribe_submit", { where: source });
                  }}
                />
                <div>
                  <label htmlFor="join-email">מייל</label>
                  <input id="join-email" type="email" required autoComplete="email" dir="ltr" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="join-email-hint" />
                  <p id="join-email-hint" className="small muted field-hint">{newsletter ? "לכניסה ולמייל השבועי. לא מוכרים ולא משתפים." : "לכניסה בלבד. לא מוכרים ולא משתפים."}</p>
                </div>
                <div>
                  <label htmlFor="join-password">סיסמה (לא חובה)</label>
                  <input id="join-password" type="password" autoComplete="new-password" dir="ltr" minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="join-password-hint" />
                  <p id="join-password-hint" className="small muted field-hint">{MIN_PASSWORD} תווים לפחות. בלי סיסמה נכנסים כל פעם עם קישור במייל.</p>
                </div>
                {phase === "error" && <div className="notice err" role="alert">{error}</div>}
                <div className="row">
                  <button className="btn primary" disabled={phase === "sending" || (newsletter && !consent) || !email.includes("@")}>
                    {phase === "sending" ? <span className="spinner" aria-hidden /> : null}
                    {password ? "פתיחת החשבון" : "שלחו לי קישור כניסה"}
                  </button>
                  <span className="small muted">{newsletter ? "מייל אחד בשבוע, לכל היותר. אפשר להפסיק בכל רגע." : "בלי המייל השבועי. אפשר להפעיל אותו אחר כך."}</span>
                </div>
                {newsletter && <button type="button" className="tap jskip" onClick={() => { setNewsletter(false); setConsent(false); }}>בלי המייל השבועי, רק החשבון</button>}
              </form>
            )}
            <p className="small muted">כבר יש לכם חשבון? <a className="tap" href="/me">כניסה</a></p>
          </section>
        )}

        {step === 3 && (
          <section className="jstep jsent" aria-labelledby="j3">
            <div className="jicon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            </div>
            <h1 id="j3" ref={head} tabIndex={-1}>{password ? "אשרו את הכתובת" : "שלחנו קישור"}</h1>
            <p>{password
              ? <>שלחנו קישור לאישור הכתובת ל־<b className="ltr">{email}</b>. לחצו עליו פעם אחת, ומעכשיו נכנסים עם המייל והסיסמה.</>
              : <>שלחנו קישור כניסה ל־<b className="ltr">{email}</b>. לחצו עליו, ואתם בפנים.</>}
              {newsletter ? ` המייל השבועי הראשון יגיע ${firstSendLabel(frequency)}.` : ""}</p>
            <p className="muted small">לא הגיע תוך כמה דקות? בדקו בספאם או בקידומי מכירות. הקישור תקף לזמן קצר ולשימוש אחד.</p>
            <p className="small"><a className="tap" href="/feedback?from=join" data-track="feedback_open" data-track-where="join_sent">משהו חסר? יש רעיון לשיפור?</a></p>
            <div className="jfoot">
              <a className="btn primary lg" href="/companies">בינתיים, לחברות</a>
              <button type="button" className="tap jskip" onClick={() => go(2)}>שליחה לכתובת אחרת</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
