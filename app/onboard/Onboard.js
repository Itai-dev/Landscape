"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import SignupForm from "@/components/SignupForm";
import ProfileForm, { Chips, Radios, emptyProfile } from "@/components/ProfileForm";
import { UploadIcon } from "@/components/Icons";
import ComingSoon from "@/components/ComingSoon";
import { CRAFTS, CITIES, OPEN_TO, VISIBILITY, FREQUENCIES, TOPICS } from "@/lib/taxonomy";
import { REQUIRED } from "@/lib/profile";

const ERRORS = {
  sign_in: "צריך להתחבר מחדש.",
  ai_unavailable: "הבנייה האוטומטית עוד לא זמינה. ממשיכים עם שאלון קצר.",
  not_configured: "ההרשמה נפתחת בקרוב.",
  pdf_too_big: "הקובץ גדול מדי. עד 10MB.",
  not_pdf: "צריך קובץ PDF.",
  bad_url: "הקישור לא נראה תקין.",
  no_sources: "לא הצלחנו לקרוא אף מקור. נסו קובץ PDF או הדביקו טקסט.",
  refused: "לא הצלחנו לעבד את החומר. ממשיכים עם שאלון קצר.",
  ai_failed: "הבנייה האוטומטית נכשלה הפעם. ממשיכים עם שאלון קצר.",
};

const NOTES = {
  linkedin: "לינקדאין לא מאפשר לקרוא פרופילים מבחוץ, אז שמרנו רק את הקישור. כדי לבנות מהלינקדאין, מעלים את ה־PDF שלו (ההסבר למעלה).",
  page_thin: "בדף הפורטפוליו כמעט אין טקסט (נפוץ באתרים מבוססי תמונות), אז לא היה הרבה מה לקרוא.",
  page_failed: "לא הצלחנו לפתוח את הקישור. כדאי לבדוק שהוא ציבורי.",
};

// One question per missing field, then always visibility + newsletter.
const QUESTIONS = {
  name: { title: "מה השם?", kind: "text", placeholder: "שם מלא" },
  headline: { title: "מה אתם עושים, בשורה אחת?", kind: "text", placeholder: "למשל: מושן דיזיין ואנימציית תלת־ממד", hint: "זו הכותרת שמופיעה ליד השם." },
  crafts: { title: "באילו תחומים?", kind: "chips", options: CRAFTS, hint: "אפשר לבחור כמה." },
  city: { title: "מאיפה אתם עובדים?", kind: "city", hint: "העיר שממנה עובדים, או ״מרחוק״." },
  open_to: { title: "מה מעניין אתכם עכשיו?", kind: "chips", options: OPEN_TO },
  visibility: { title: "מי יכול לראות את הפרופיל?", kind: "radio", options: VISIBILITY, hint: "אפשר לשנות בכל רגע." },
  newsletter: { title: "ניוזלטר: כל כמה זמן ועל מה?", kind: "newsletter" },
};

// Start from what was published about a claimed person: name, role(s), company.
const fromClaim = (claim) =>
  claim
    ? {
        ...emptyProfile(),
        name: claim.name,
        headline: claim.roles[0] ? `${claim.roles[0].role}, ${claim.roles[0].org}` : "",
        experience: claim.roles.map((r) => ({ org: r.org, role: r.role, start: "", end: "" })),
      }
    : emptyProfile();

export default function Onboard({ claim = null }) {
  const { supabase, configured } = useSupabase();
  const user = useUser();
  const [step, setStep] = useState("sources"); // sources | loading | questions | review
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);
  const [profile, setProfile] = useState(fromClaim(claim));
  const [aiFields, setAiFields] = useState([]);
  const [visibility, setVisibility] = useState("members");
  const [prefs, setPrefs] = useState({ frequency: "off", topics: [] });
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [existing, setExisting] = useState(null);
  const [saved, setSaved] = useState(null);
  const here = claim ? `/onboard?claim=${encodeURIComponent(claim.id)}` : "/onboard";

  // Load newsletter choice from sign-up, and whether a profile already exists.
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from("newsletter_prefs").select("frequency, topics").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setPrefs({ frequency: data.frequency, topics: data.topics || [] }));
    supabase.from("profiles").select("slug").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setExisting(data.slug));
  }, [supabase, user]);

  const Claim = () =>
    claim ? (
      <div className="notice">
        בונים את הפרופיל של <b><bdi>{claim.name}</bdi></b>, לפי מה שפורסם:{" "}
        {claim.roles.map((r, i) => <span key={i}>{i > 0 ? " · " : ""}<bdi>{r.role}</bdi>, <bdi>{r.org}</bdi></span>)}.
        הכרטיס מפרסומים פומביים יוחלף בפרופיל המלא.
      </div>
    ) : null;

  if (!configured) {
    return (
      <div className="stack">
        <div className="pagehead"><h1>פרופיל מקצועי בדקה</h1><p>מעלים קורות חיים או קישור לפורטפוליו, וה־AI מכין טיוטה.</p></div>
        <Claim />
        <ComingSoon title="ההרשמה והפרופילים נפתחים בקרוב" />
        <HowTo />
      </div>
    );
  }
  if (user === undefined) return <p className="muted center">טוען…</p>;
  if (!user) {
    return (
      <div className="stack">
        <div className="pagehead">
          <h1>{claim ? "זה אתם? בונים פרופיל" : "פרופיל מקצועי בדקה"}</h1>
          <p>קודם נכנסים עם המייל. הקישור מחזיר ישר לכאן.</p>
        </div>
        <Claim />
        <div className="card"><SignupForm next={here} /></div>
        <HowTo />
      </div>
    );
  }

  function startQuestions(draftProfile, missing) {
    setProfile(draftProfile);
    setQueue([...missing, "visibility", "newsletter"]);
    setQi(0);
    setStep("questions");
  }
  const missingOf = (p) => REQUIRED.filter((k) => (Array.isArray(p[k]) ? p[k].length === 0 : !p[k]));

  async function build(e) {
    e.preventDefault();
    setError("");
    setNotes([]);
    setStep("loading");
    const body = new FormData();
    if (file) body.set("cv", file);
    if (link.trim()) body.set("url", link.trim());
    if (text.trim()) body.set("text", text.trim());
    const res = await fetch("/api/draft", { method: "POST", body }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    setNotes(out.notes || []);
    if (!res || !res.ok) {
      const code = out.error || "ai_failed";
      if (["pdf_too_big", "not_pdf", "bad_url", "no_sources"].includes(code)) {
        setError(ERRORS[code]);
        setStep("sources");
        return;
      }
      setError(ERRORS[code] || ERRORS.ai_failed);
      startQuestions(profile, missingOf(profile));
      return;
    }
    // Published facts from a claim stay unless the draft has something.
    const merged = { ...profile, ...Object.fromEntries(Object.entries(out.draft || {}).filter(([, v]) => (Array.isArray(v) ? v.length : v))) };
    setAiFields(out.ai_fields || []);
    startQuestions(merged, missingOf(merged));
  }

  if (saved) {
    return (
      <div className="stack center">
        <div className="pagehead">
          <h1>הפרופיל מוכן</h1>
          <p>{visibility === "hidden" ? "הפרופיל שמור ומוסתר. אפשר לפרסם אותו מתי שרוצים." : "הפרופיל באוויר."}</p>
        </div>
        <div className="row center">
          <a className="btn primary" href={`/p/${saved.slug}`}>לפרופיל שלי</a>
          <a className="btn" href="/people">לאנשים</a>
          <a className="btn" href="/companies">לחברות</a>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="stack">
        <Progress value={100} />
        <div className="pagehead"><h1>בדיקה אחרונה</h1><p>ככה הפרופיל ייראה. אפשר לתקן הכול, ושום דבר לא נשמר לפני האישור.</p></div>
        <ProfileForm
          initial={{ profile, ai_fields: aiFields, visibility, prefs, claimed_from: claim?.id || null }}
          cvFile={file}
          submitLabel="אישור ושמירה"
          onSaved={setSaved}
        />
      </div>
    );
  }

  if (step === "questions") {
    const key = queue[qi];
    const q = QUESTIONS[key];
    const next = () => (qi + 1 < queue.length ? setQi(qi + 1) : setStep("review"));
    const value = profile[key];
    const answered =
      key === "visibility" || key === "newsletter" ? true :
      Array.isArray(value) ? value.length > 0 : Boolean(value && String(value).trim());
    const left = queue.length - 2;
    return (
      <div className="stack">
        <Progress value={40 + (60 * qi) / queue.length} />
        {error && qi === 0 && <div className="notice">{error}</div>}
        {notes.length > 0 && qi === 0 && notes.map((n) => <div key={n} className="notice">{NOTES[n]}</div>)}
        {qi === 0 && !error && aiFields.length > 0 && (
          <p className="muted center">יש טיוטה. {left > 0 ? `נשארו ${left === 1 ? "שאלה אחת" : `${left} שאלות`} על מה שחסר, ועוד שתיים קצרות.` : "נשארו שתי שאלות קצרות."}</p>
        )}
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (answered) next(); }}>
          <p className="small muted" style={{ marginBlockEnd: 8 }}>שאלה {qi + 1} מתוך {queue.length}</p>
          <h2>{q.title}</h2>
          {q.hint && <p className="hint">{q.hint}</p>}
          {q.kind === "text" && (
            <input type="text" autoFocus placeholder={q.placeholder} value={value || ""}
              onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
          )}
          {q.kind === "city" && (
            <>
              <input type="text" autoFocus list="cities-q" placeholder="תל אביב" value={value || ""}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
              <datalist id="cities-q">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </>
          )}
          {q.kind === "chips" && (
            <Chips name={q.title} options={q.options} value={value || []} onChange={(v) => setProfile({ ...profile, [key]: v })} />
          )}
          {q.kind === "radio" && <Radios name="visibility-q" options={q.options} value={visibility} onChange={setVisibility} />}
          {q.kind === "newsletter" && (
            <div className="stack">
              <Radios name="freq-q" options={FREQUENCIES} value={prefs.frequency} onChange={(f) => setPrefs({ ...prefs, frequency: f })} />
              {prefs.frequency !== "off" && (
                <>
                  <p className="hint">על מה לעדכן?</p>
                  <Chips name="נושאים" options={TOPICS} value={prefs.topics} onChange={(t) => setPrefs({ ...prefs, topics: t })} />
                </>
              )}
            </div>
          )}
          <div className="row" style={{ marginBlockStart: 24 }}>
            <button className="btn primary" disabled={!answered}>{qi + 1 < queue.length ? "הבא" : "לסיכום"}</button>
            {qi > 0 && <button type="button" className="btn ghost" onClick={() => setQi(qi - 1)}>חזרה</button>}
          </div>
        </form>
      </div>
    );
  }

  // sources / loading
  const loading = step === "loading";
  return (
    <div className="stack">
      <Progress value={loading ? 30 : 10} />
      <div className="pagehead">
        <h1>פרופיל מקצועי בדקה</h1>
        <p>נותנים נקודת פתיחה אחת או יותר. ה־AI מכין טיוטה, ושואלים רק על מה שחסר.</p>
      </div>
      <Claim />
      {existing && (
        <div className="notice">
          כבר יש לכם פרופיל. <a href="/me">לעריכה</a> או <a href={`/p/${existing}`}>לצפייה</a>. אפשר גם לבנות אותו מחדש כאן.
        </div>
      )}
      {error && <div className="notice err" role="alert">{error}</div>}
      <form onSubmit={build} className="card" aria-busy={loading}>
        <label className={`drop${file ? " has" : ""}`}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <span className="ico"><UploadIcon size={28} /></span>
          {file ? <b dir="auto">{file.name}</b> : <><b>העלאת קורות חיים או PDF מלינקדאין</b><span className="small muted">PDF עד 10MB</span></>}
        </label>
        <details style={{ marginBlockStart: 12 }}>
          <summary className="small">איך מורידים PDF מלינקדאין?</summary>
          <p className="small muted" style={{ marginBlockStart: 8 }}>
            לינקדאין לא מאפשר לאתרים אחרים לקרוא פרופילים, אז מורידים קובץ: בפרופיל בלינקדאין (במחשב) לוחצים על
            <b> Resources</b> (או <b>More</b>) ואז <b>Save to PDF</b>, ומעלים את הקובץ כאן.
          </p>
        </details>
        <div className="or">ואפשר גם</div>
        <div className="field">
          <label htmlFor="ob-link">קישור לפורטפוליו או לשואוריל</label>
          <p className="hint">Behance, Vimeo, ArtStation או אתר אישי</p>
          <input id="ob-link" type="url" dir="ltr" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ob-text">כמה מילים עליכם</label>
          <textarea id="ob-text" placeholder="מה עושים, איפה עבדתם, באילו כלים…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn primary" disabled={loading || (!file && !link.trim() && !text.trim())}>
            {loading ? <><span className="spinner" aria-hidden /> מכינים טיוטה…</> : "בניית הפרופיל"}
          </button>
          <button type="button" className="btn ghost" disabled={loading} onClick={() => startQuestions(profile, missingOf(profile))}>
            אין לי חומר, אמלא שאלון קצר
          </button>
        </div>
        {loading && <p className="small muted" role="status" style={{ marginBlockStart: 12 }}>קוראים את החומר ומחלצים תחומים, כלים וניסיון. זה לוקח עד חצי דקה.</p>}
      </form>
      <p className="small muted center">
        הקבצים והקישורים משמשים רק לבניית הטיוטה. קורות החיים לא נשמרים, אלא אם בוחרים בזה בסוף. <a href="/privacy">פרטיות</a>
      </p>
    </div>
  );
}

function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-label="התקדמות" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div style={{ width: `${value}%` }} />
    </div>
  );
}

function HowTo() {
  return (
    <div className="card">
      <h3>איך זה עובד</h3>
      <ol className="muted" style={{ paddingInlineStart: 20, margin: 0 }}>
        <li>מעלים קורות חיים, PDF מלינקדאין או קישור לפורטפוליו.</li>
        <li>ה־AI מכין טיוטה: תחומים, כלים, ניסיון וקישורים.</li>
        <li>שאלון קצר רק על מה שחסר.</li>
        <li>בודקים, מתקנים ומחליטים מי רואה.</li>
      </ol>
    </div>
  );
}
