"use client";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { CraftIcon, BuildingIcon, BellIcon } from "@/components/Icons";
import KindTag from "@/components/KindTag";
import { ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";
import { setTracked } from "@/lib/trackSync";

const tryTrack = (name, props) => { try { track(name, props); } catch {} };
const FIRST = 12; // crafts shown before "עוד תחומים"
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }))
  .catch(() => ({ ok: false }));

const TENDER_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M9 13h6M9 17h4" /></svg>
);
const PULSE_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);
const CHECK = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

// Welcome after sign-up, on one page with no reloads (each screen is a history entry, so the phone's back gesture
// goes back a screen): 1) you're in, what was set up and what the site does; 2) crafts, only if none were chosen;
// 3) companies to follow, which come first in the weekly email; then a short "all set".
export default function WelcomeFlow({ demo = false, email, crafts: initialCrafts, allCrafts, newsletter, alertsConsent, following, stats, suggestions: initialSuggestions }) {
  const needCrafts = initialCrafts.length === 0;
  const screens = needCrafts ? ["hello", "crafts", "follow", "done"] : ["hello", "follow", "done"];
  const [step, setStep] = useState(0);
  const [crafts, setCrafts] = useState([]);
  const [more, setMore] = useState(false);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [picked, setPicked] = useState([]);
  const [alerts, setAlerts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [followed, setFollowed] = useState(0);
  const head = useRef(null);
  const screen = screens[step];
  const chosen = needCrafts ? allCrafts.filter((c) => crafts.includes(c.slug)) : initialCrafts;

  useEffect(() => {
    const onPop = (e) => setStep(Number.isInteger(e.state?.welcomeStep) ? e.state.welcomeStep : 0);
    window.history.replaceState({ ...(window.history.state || {}), welcomeStep: 0 }, "");
    window.addEventListener("popstate", onPop);
    tryTrack("welcome_open", { crafts: initialCrafts.length, newsletter: Boolean(newsletter) });
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (n) => {
    setStep(n);
    setError("");
    try { window.history.pushState({ ...(window.history.state || {}), welcomeStep: n }, ""); } catch {}
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    head.current?.focus({ preventScroll: true });
  }, [step]);

  async function saveCrafts() {
    setBusy(true);
    const res = await post("/api/welcome", { crafts, demo });
    setBusy(false);
    if (res.ok) setSuggestions(res.suggestions || []);
    tryTrack("welcome_crafts", { crafts: crafts.length });
    go(step + 1);
  }

  async function follow() {
    if (!picked.length) return;
    setBusy(true);
    setError("");
    const res = demo ? { ok: true } : await post("/api/follows", { add: picked, consent: alerts && !alertsConsent });
    setBusy(false);
    if (!res.ok) {
      setError(res.error === "limit" ? "הגעתם למספר החברות המרבי במעקב." : "לא הצלחנו לשמור כרגע. אפשר לנסות שוב.");
      return;
    }
    if (!demo) picked.forEach((id) => setTracked(id, true));
    setFollowed(picked.length);
    tryTrack("welcome_follow", { n: picked.length, alerts });
    go(step + 1);
  }

  const toggle = (list, set, v) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const shownCrafts = more ? allCrafts : allCrafts.slice(0, FIRST);

  return (
    <div className="joinflow welcome">
      <div className="wrap jwrap">
        {demo && <p className="notice small">תצוגה לדוגמה (רק באתר התצוגה המקדימה): שום דבר לא נשמר.</p>}
        {screen !== "done" && (
          <div className="jtop">
            {step > 0 ? (
              <button type="button" className="jback" onClick={() => window.history.back()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                חזרה
              </button>
            ) : <span />}
            <ol className="jdots" aria-label={`שלב ${step + 1} מתוך ${screens.length - 1}`}>
              {screens.slice(0, -1).map((s, i) => <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-hidden="true" />)}
            </ol>
          </div>
        )}

        {screen === "hello" && (
          <section className="jstep" aria-labelledby="w0">
            <div className="wok" aria-hidden="true">{CHECK}</div>
            <p className="kicker">החשבון מוכן</p>
            <h1 id="w0" ref={head} tabIndex={-1}>ברוכים הבאים.<br />אתם בפנים.</h1>
            <div className="wstatus">
              <p><span className="muted">נכנסתם בתור</span> <bdi className="ltr">{email}</bdi></p>
              {newsletter ? (
                <p><b>המייל השבועי פעיל.</b> הראשון יגיע {newsletter.first}{chosen.length ? `, בתחומים: ${chosen.map((c) => c.he).join(", ")}` : ""}. <a className="tap" href="/digest/settings">שינוי</a></p>
              ) : (
                <p><b>בלי ניוזלטר בינתיים.</b> אפשר להפעיל אותו בכל רגע. <a className="tap" href="/digest/settings">להפעלת המייל השבועי</a></p>
              )}
            </div>

            <h2 className="wh2">מה יש כאן</h2>
            <ul className="wgrid">
              <li><a className="wtile" href="/companies" data-track="welcome_tile" data-track-label="companies"><span className="wi"><BuildingIcon size={24} /></span><b>חברות</b><span>{stats.orgs} מותגים, משרדים וסטודיואים. מי מזמין מה, ודרך מי.</span></a></li>
              <li><a className="wtile" href="/companies#signals" data-track="welcome_tile" data-track-label="updates"><span className="wi">{PULSE_ICON}</span><b>עדכונים</b><span>מינויים, מעברי משרד וקמפיינים. כל עדכון עם מקור.</span></a></li>
              <li><a className="wtile" href="/tenders" data-track="welcome_tile" data-track-label="tenders"><span className="wi">{TENDER_ICON}</span><b>מכרזים</b><span>{stats.tenders ? `${stats.tenders} פתוחים להגשה עכשיו, ` : ""}עם קישור לפרסום הרשמי ומועד הגשה.</span></a></li>
              <li><a className="wtile" href="/me#follows" data-track="welcome_tile" data-track-label="follows"><span className="wi"><BellIcon size={24} /></span><b>מעקב והתראות</b><span>שומרים חברות, ומקבלים מייל כשמשהו משתנה אצלן.</span></a></li>
            </ul>

            <div className="jfoot">
              <button type="button" className="btn primary lg" onClick={() => go(1)}>{needCrafts ? "בואו נתאים את זה אליכם" : "בחרו חברות למעקב"}</button>
              <a className="tap jskip" href="/">דלגו לאתר</a>
            </div>
          </section>
        )}

        {screen === "crafts" && (
          <section className="jstep" aria-labelledby="w1">
            <h1 id="w1" ref={head} tabIndex={-1}>מה אתם עושים?</h1>
            <p className="muted">אפשר לבחור כמה. העדכונים והחברות יותאמו לתחומים שלכם.</p>
            <div className="jcrafts" role="group" aria-label="תחומים">
              {shownCrafts.map((c) => (
                <button key={c.slug} type="button" className="jcraft" aria-pressed={crafts.includes(c.slug)} onClick={() => toggle(crafts, setCrafts, c.slug)}>
                  <CraftIcon craft={c.slug} size={24} />
                  <span>{c.he}</span>
                </button>
              ))}
            </div>
            {!more && allCrafts.length > FIRST && <button type="button" className="tap jmore" onClick={() => setMore(true)}>עוד {allCrafts.length - FIRST} תחומים</button>}
            <div className="jfoot">
              <button type="button" className="btn primary lg" disabled={busy} onClick={saveCrafts}>
                {busy ? <span className="spinner" aria-hidden /> : null}
                {crafts.length ? `המשך (${crafts.length})` : "המשך, כל התחומים"}
              </button>
            </div>
          </section>
        )}

        {screen === "follow" && (
          <section className="jstep" aria-labelledby="w2">
            <h1 id="w2" ref={head} tabIndex={-1}>חברות שכדאי לעקוב אחריהן</h1>
            <p className="muted">
              {chosen.length ? `מי שמזמין ${chosen.slice(0, 3).map((c) => c.he).join(", ")}${chosen.length > 3 ? " ועוד" : ""}. ` : "מותגים עם חדשות מהחודש האחרון. "}
              מה שמסמנים מגיע ראשון במייל השבועי, תחת ״במעקב שלכם״.
            </p>
            {suggestions.length ? (
              <ul className="wpicks" role="group" aria-label="חברות">
                {suggestions.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="wpick" aria-pressed={picked.includes(o.id)} onClick={() => toggle(picked, setPicked, o.id)}>
                      <span className="wlogo">{o.logo ? <img src={o.logo} alt="" width={40} height={40} loading="lazy" decoding="async" style={o.logo_px ? { maxWidth: Math.min(o.logo_px, 36), maxHeight: Math.min(o.logo_px, 36) } : undefined} /> : o.name.slice(0, 1)}</span>
                      <span className="wtext">
                        <span className="wname"><bdi>{o.name}</bdi> <KindTag kind={o.kind} /></span>
                        {o.reason && <span className="wreason">{o.reason}</span>}
                      </span>
                      <span className="wcheck" aria-hidden="true">{picked.includes(o.id) ? "✓" : "+"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">עוד אין הצעות לתחומים האלה. אפשר להוסיף חברות בכל רגע מ<a href="/companies">רשימת החברות</a>, בכפתור ״מעקב״.</p>
            )}
            {suggestions.length > 0 && !alertsConsent && (
              <label className="check">
                <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
                <span>{ALERTS_CONSENT_TEXT}</span>
              </label>
            )}
            {error && <div className="notice err" role="alert">{error}</div>}
            <div className="jfoot">
              <button type="button" className="btn primary lg" disabled={busy || !picked.length} onClick={follow}>
                {busy ? <span className="spinner" aria-hidden /> : null}
                {picked.length ? `עקבו אחרי ${picked.length === 1 ? "חברה אחת" : `${picked.length} חברות`}` : "בחרו חברות"}
              </button>
              <button type="button" className="tap jskip" onClick={() => { tryTrack("welcome_follow", { n: 0, skipped: true }); go(step + 1); }}>אחר כך</button>
            </div>
          </section>
        )}

        {screen === "done" && (
          <section className="jstep jsent" aria-labelledby="w3">
            <div className="wok" aria-hidden="true">{CHECK}</div>
            <h1 id="w3" ref={head} tabIndex={-1}>הכול מוכן.</h1>
            <p>
              {followed + following > 0 ? `${followed + following === 1 ? "חברה אחת" : `${followed + following} חברות`} במעקב. ` : ""}
              {newsletter ? `המייל הראשון יגיע ${newsletter.first}.` : "אפשר להפעיל את המייל השבועי מהחשבון."}
            </p>
            <div className="jfoot">
              <a className="btn primary lg" href="/companies">לכל החברות</a>
              <a className="tap jskip" href="/me">לחשבון שלי</a>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
