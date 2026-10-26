"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import SignupForm from "@/components/SignupForm";
import ComingSoon from "@/components/ComingSoon";
import {
  SURVEY_CRAFTS, MODES, EXPERIENCE, REGIONS, HOURLY, DAILY, SALARY, PRICE, DELIVERABLES, PAYMENT_TERMS, LATE_SHARE,
  DELAY, CLIENT_TYPES, CHANNELS, MAX_CHANNELS, AI_SCALE, PAIN_MAX, CLOSES_LABEL, isIndependent,
} from "@/lib/survey/config";
import ShareInvite from "../ShareInvite";

// A draft in this browser, per account (key includes the user id) so a shared device never shows one
// person's rates to another. Sign-out clears every draft (components/SignOutButton.js).
export const DRAFT = "landscape-survey-draft";
let draftKey = null;
const load = () => { try { return draftKey ? JSON.parse(localStorage.getItem(draftKey) || "null") : null; } catch { return null; } };
const keep = (a) => { try { if (draftKey) localStorage.setItem(draftKey, JSON.stringify(a)); } catch {} };
const drop = () => { try { if (draftKey) localStorage.removeItem(draftKey); } catch {} };

// One choice (radio) or several (checkbox) as pill chips.
function Choices({ name, options, value, onChange, multi = false, max = 99, label }) {
  const has = (s) => (multi ? (value || []).includes(s) : value === s);
  const toggle = (s) => {
    if (!multi) return onChange(s);
    const cur = value || [];
    if (cur.includes(s)) onChange(cur.filter((x) => x !== s));
    else if (cur.length < max) onChange([...cur, s]);
  };
  return (
    <div className="chips" role={multi ? "group" : "radiogroup"} aria-label={label}>
      {options.map((o) => (
        <label key={o.slug} className={`chip${has(o.slug) ? " on" : ""}`}>
          <input type={multi ? "checkbox" : "radio"} name={name} checked={has(o.slug)} onChange={() => toggle(o.slug)}
            disabled={multi && !has(o.slug) && (value || []).length >= max} />
          {o.ltr ? <bdi dir="ltr">{o.he}</bdi> : o.he}
        </label>
      ))}
    </div>
  );
}

// A money question: pick a band, or type the exact number (optional).
function Money({ name, bands, band, exact, onBand, onExact, unit }) {
  return (
    <div className="stack">
      <Choices name={name} options={bands} value={band} onChange={onBand} label={unit} />
      <div className="exact">
        <label htmlFor={`${name}-exact`} className="small muted">או מספר מדויק ב־₪ (לא חובה)</label>
        <input id={`${name}-exact`} type="text" inputMode="numeric" dir="ltr" autoComplete="off" placeholder="₪"
          value={exact ?? ""} onChange={(e) => onExact(e.target.value.replace(/[^\d]/g, "").slice(0, 7))} />
      </div>
    </div>
  );
}

function Q({ title, hint, children }) {
  return (
    <fieldset className="q">
      <legend>{title}</legend>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </fieldset>
  );
}

export default function Questionnaire() {
  const { configured } = useSupabase();
  const user = useUser();
  const [a, setA] = useState({});
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState("loading"); // loading | form | saving | done | closed | error
  const [wasDone, setWasDone] = useState(false);
  const [msg, setMsg] = useState("");
  const top = useRef(null);

  useEffect(() => {
    if (!user) return;
    draftKey = `${DRAFT}:${user.id}`;
    try { localStorage.removeItem(DRAFT); } catch {} // drafts from before they were per account
    fetch("/api/survey", { cache: "no-store" }).then((r) => r.json()).then((s) => {
      if (s.open === false) return setPhase("closed");
      const server = s.response?.answers || {};
      const local = load();
      setA(s.response?.completed ? server : { ...server, ...(local || {}) });
      setWasDone(Boolean(s.response?.completed));
      setPhase("form");
    }).catch(() => { setA(load() || {}); setPhase("form"); });
  }, [user]);

  const set = (k) => (v) => setA((cur) => { const next = { ...cur, [k]: v }; keep(next); return next; });
  const setPrice = (slug, part) => (v) => setA((cur) => {
    const p = { ...(cur.prices || {}) };
    p[slug] = { ...(p[slug] || {}), [part]: v };
    const next = { ...cur, prices: p };
    keep(next);
    return next;
  });

  const indep = isIndependent(a.mode);
  const steps = useMemo(() => {
    const s = [
      { id: "craft", ok: () => a.craft },
      { id: "work", ok: () => a.mode && a.experience && a.region },
      indep ? { id: "rate", ok: () => a.hourly || a.daily || a.hourly_exact || a.daily_exact } : { id: "salary", ok: () => a.salary || a.salary_exact },
    ];
    if (indep && DELIVERABLES[a.craft]?.length) s.push({ id: "prices", ok: () => true });
    if (indep) s.push({ id: "pay", ok: () => a.terms && a.late_share && (a.late_share === "none" || a.delay) });
    s.push({ id: "clients", ok: () => (indep ? (a.clients || []).length : true) && (a.channels || []).length });
    s.push({ id: "ai", ok: () => a.ai_demand && a.ai_rates });
    s.push({ id: "pain", ok: () => true });
    return s;
  }, [a, indep]);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  function go(n) {
    setI(n);
    setMsg("");
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function next() {
    if (!step.ok()) return;
    if (!last) {
      fetch("/api/survey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: a, complete: false }) }).catch(() => {});
      return go(i + 1);
    }
    setPhase("saving");
    try {
      const r = await fetch("/api/survey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: a, complete: true }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { drop(); setPhase("done"); return; }
      setPhase("form");
      if (j.error === "missing") {
        const first = steps.findIndex((s) => !s.ok());
        setMsg("חסרות כמה תשובות. השלימו אותן ונסו שוב.");
        if (first >= 0) go(first);
      } else if (j.error === "closed") setPhase("closed");
      else if (j.error === "sign_in") setMsg("יצאתם מהחשבון. היכנסו שוב מהעמוד הראשי של הסקר. התשובות נשמרות.");
      else setMsg("לא הצלחנו לשמור. התשובות שמורות בדפדפן. נסו שוב.");
    } catch {
      setPhase("form");
      setMsg("אין חיבור כרגע. התשובות שמורות בדפדפן. נסו שוב.");
    }
  }

  if (!configured) return <ComingSoon title="הסקר נפתח בקרוב" text="ההרשמה לאתר עוד לא פתוחה. בינתיים, הציצו בחברות ובאנשים שבמאגר." />;
  if (user === undefined || (user && phase === "loading")) return <div className="soon" aria-busy="true"><span className="spinner" aria-hidden /><p>טוענים את הסקר…</p></div>;
  if (!user) {
    return (
      <div className="card stack">
        <h2>נכנסים עם המייל ומתחילים</h2>
        <p className="muted small">שולחים לכם קישור כניסה, והסקר נפתח מיד אחריו. התשובה אחת לכל חשבון.</p>
        <SignupForm next="/survey/start" />
      </div>
    );
  }
  if (phase === "closed") {
    return (
      <div className="soon">
        <h2>הסקר נסגר</h2>
        <p>הוא היה פתוח עד {CLOSES_LABEL}. התוצאות פתוחות לכולם.</p>
        <a className="btn primary" href="/survey/results">לתוצאות</a>
      </div>
    );
  }
  if (phase === "done") {
    return (
      <div className="stack">
        <div className="soon">
          <h2>{wasDone ? "התשובות עודכנו. תודה." : "התשובות נשמרו. תודה."}</h2>
          <p>התוצאות פתוחות לכם כבר עכשיו. כל תשובה נוספת הופכת אותן למדויקות יותר.</p>
          <a className="btn primary lg" href="/survey/results">לתוצאות</a>
        </div>
        <ShareInvite />
      </div>
    );
  }

  const pct = Math.round(((i + 1) / steps.length) * 100);
  return (
    <form className="survey stack" onSubmit={(e) => { e.preventDefault(); next(); }} ref={top}>
      <div>
        <div className="row survey-top">
          <span className="small muted">שלב {i + 1} מתוך {steps.length}</span>
          <span className="small muted">{wasDone ? "עריכת תשובות" : "נשמר אוטומטית"}</span>
        </div>
        <div className="progress" role="progressbar" aria-label="התקדמות בסקר" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      {step.id === "craft" && (
        <>
          <Q title="מה התחום העיקרי שלכם?" hint="התחום שבו עושים את רוב העבודה.">
            <Choices name="craft" options={SURVEY_CRAFTS} value={a.craft} onChange={set("craft")} label="תחום עיקרי" />
          </Q>
          {a.craft && (
            <Q title="ותחום משני? (לא חובה)">
              <Choices name="craft2" options={SURVEY_CRAFTS.filter((c) => c.slug !== a.craft)} value={a.craft2}
                onChange={(v) => set("craft2")(a.craft2 === v ? null : v)} label="תחום משני" />
            </Q>
          )}
        </>
      )}

      {step.id === "work" && (
        <>
          <Q title="איך אתם עובדים רוב הזמן?">
            <Choices name="mode" options={MODES} value={a.mode} onChange={set("mode")} label="צורת עבודה" />
          </Q>
          <Q title="כמה שנות ניסיון בתחום?">
            <Choices name="experience" options={EXPERIENCE} value={a.experience} onChange={set("experience")} label="ניסיון" />
          </Q>
          <Q title="איפה עובדים?">
            <Choices name="region" options={REGIONS} value={a.region} onChange={set("region")} label="אזור" />
          </Q>
        </>
      )}

      {step.id === "rate" && (
        <>
          <Q title="מה התעריף הרגיל לשעה?" hint="לפני מע״מ, ללקוח ישיר. ענו על שעה, על יום או על שניהם.">
            <Money name="hourly" bands={HOURLY} band={a.hourly} exact={a.hourly_exact} onBand={set("hourly")} onExact={set("hourly_exact")} unit="תעריף לשעה" />
          </Q>
          <Q title="ומה התעריף ליום עבודה?">
            <Money name="daily" bands={DAILY} band={a.daily} exact={a.daily_exact} onBand={set("daily")} onExact={set("daily_exact")} unit="תעריף ליום" />
          </Q>
        </>
      )}

      {step.id === "salary" && (
        <Q title="מה השכר החודשי ברוטו?" hint="משרה מלאה, בלי בונוסים. אם המשרה חלקית, חשבו לפי משרה מלאה.">
          <Money name="salary" bands={SALARY} band={a.salary} exact={a.salary_exact} onBand={set("salary")} onExact={set("salary_exact")} unit="שכר חודשי" />
        </Q>
      )}

      {step.id === "prices" && (
        <>
          <p className="muted">כמה גובים בדרך כלל על העבודות האלה, כפרויקט שלם לפני מע״מ? דלגו על מה שלא עושים.</p>
          {DELIVERABLES[a.craft].map((d) => (
            <Q key={d.slug} title={d.he}>
              <Money name={`p-${d.slug}`} bands={PRICE} band={a.prices?.[d.slug]?.band} exact={a.prices?.[d.slug]?.exact}
                onBand={setPrice(d.slug, "band")} onExact={setPrice(d.slug, "exact")} unit={d.he} />
            </Q>
          ))}
        </>
      )}

      {step.id === "pay" && (
        <>
          <Q title="מה תנאי התשלום הנפוצים אצלכם?" hint="מה שרוב הלקוחות מקבלים בפועל.">
            <Choices name="terms" options={PAYMENT_TERMS} value={a.terms} onChange={set("terms")} label="תנאי תשלום" />
          </Q>
          <Q title="כמה מהחשבוניות משולמות באיחור?" hint="באיחור אחרי מה שסוכם.">
            <Choices name="late" options={LATE_SHARE} value={a.late_share} onChange={set("late_share")} label="איחורים" />
          </Q>
          {a.late_share && a.late_share !== "none" && (
            <Q title="וכמה זמן נמשך איחור טיפוסי?">
              <Choices name="delay" options={DELAY.filter((d) => d.slug !== "none")} value={a.delay} onChange={set("delay")} label="משך האיחור" />
            </Q>
          )}
        </>
      )}

      {step.id === "clients" && (
        <>
          {indep && (
            <Q title="מי הלקוחות?" hint="בחרו את כל מה שמתאים.">
              <Choices name="clients" multi options={CLIENT_TYPES} value={a.clients} onChange={set("clients")} label="סוגי לקוחות" />
            </Q>
          )}
          <Q title={indep ? "איך לקוחות מגיעים אליכם?" : "איך מצאתם את העבודה הנוכחית?"} hint={`עד ${MAX_CHANNELS} תשובות.`}>
            <Choices name="channels" multi max={MAX_CHANNELS} options={CHANNELS} value={a.channels} onChange={set("channels")} label="ערוצים" />
          </Q>
        </>
      )}

      {step.id === "ai" && (
        <>
          <Q title="מה קרה לביקוש לעבודה שלכם בשנה האחרונה בגלל AI?">
            <Choices name="ai_demand" options={AI_SCALE} value={a.ai_demand} onChange={set("ai_demand")} label="השפעת AI על הביקוש" />
          </Q>
          <Q title="ומה קרה לתעריפים או לשכר?">
            <Choices name="ai_rates" options={AI_SCALE} value={a.ai_rates} onChange={set("ai_rates")} label="השפעת AI על התעריפים" />
          </Q>
        </>
      )}

      {step.id === "pain" && (
        <Q title="מה הכי קשה היום בעבודה? (לא חובה)" hint="משפט או שניים. בלי שמות של לקוחות או של אנשים. הטקסט לא מתפרסם, הוא עוזר לנו להבין מה לבדוק בהמשך.">
          <textarea value={a.pain || ""} maxLength={PAIN_MAX} onChange={(e) => set("pain")(e.target.value)} aria-label="מה הכי קשה היום" />
          <p className="small muted">{(a.pain || "").length}/{PAIN_MAX}</p>
        </Q>
      )}

      {msg && <div className="notice err" role="alert">{msg}</div>}

      <div className="row survey-nav">
        <button className="btn primary lg" disabled={!step.ok() || phase === "saving"}>
          {phase === "saving" && <span className="spinner" aria-hidden />}
          {last ? (wasDone ? "שמירת השינויים" : "שליחת התשובות") : "לשאלה הבאה"}
        </button>
        {i > 0 && <button type="button" className="btn ghost" onClick={() => go(i - 1)}>לשאלה הקודמת</button>}
      </div>
    </form>
  );
}
