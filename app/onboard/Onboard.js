"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { useUser } from "@/components/useUser";
import SignupForm from "@/components/SignupForm";
import ProfileForm, { Chips, Radios, emptyProfile } from "@/components/ProfileForm";
import { CRAFTS, CITIES, OPEN_TO, VISIBILITY, FREQUENCIES, TOPICS } from "@/lib/taxonomy";
import { REQUIRED } from "@/lib/profile";

const ERRORS = {
  sign_in: "צריך להתחבר מחדש.",
  ai_unavailable: "הבנייה האוטומטית עוד לא זמינה. נמשיך עם שאלון קצר.",
  not_configured: "ההרשמה נפתחת בקרוב.",
  pdf_too_big: "הקובץ גדול מדי (עד 10MB).",
  not_pdf: "צריך קובץ PDF.",
  bad_url: "הקישור לא נראה תקין.",
  no_sources: "לא הצלחנו לקרוא אף מקור. נסו קובץ PDF או הדביקו טקסט.",
  refused: "לא הצלחנו לעבד את החומר. נמשיך עם שאלון קצר.",
  ai_failed: "הבנייה האוטומטית נכשלה הפעם. נמשיך עם שאלון קצר.",
};

const NOTES = {
  linkedin: "לינקדאין לא מאפשר לקרוא פרופילים מבחוץ. שמרנו את הקישור. כדי שנבנה מהלינקדאין, העלו את ה־PDF שלו (הסבר למעלה).",
  page_thin: "בדף הפורטפוליו כמעט אין טקסט (נפוץ באתרים מבוססי תמונות), אז לא היה הרבה מה לקרוא ממנו.",
  page_failed: "לא הצלחנו לפתוח את הקישור. בדקו שהוא ציבורי.",
};

// One question per missing field, then always visibility + newsletter.
const QUESTIONS = {
  name: { title: "איך קוראים לך?", kind: "text", placeholder: "שם מלא" },
  headline: { title: "מה את/ה עושה, בשורה אחת?", kind: "text", placeholder: "למשל: מעצב מושן ואנימטור 3D", hint: "זו הכותרת שאנשים יראו ליד השם." },
  crafts: { title: "באילו תחומים?", kind: "chips", options: CRAFTS, hint: "אפשר לבחור כמה." },
  city: { title: "איפה את/ה עובד/ת?", kind: "city" },
  open_to: { title: "למה את/ה פתוח/ה עכשיו?", kind: "chips", options: OPEN_TO },
  visibility: { title: "מי יכול לראות את הפרופיל?", kind: "radio", options: VISIBILITY, hint: "אפשר לשנות בכל רגע." },
  newsletter: { title: "ניוזלטר: כל כמה זמן ועל מה?", kind: "newsletter" },
};

export default function Onboard() {
  const { supabase, configured } = useSupabase();
  const user = useUser();
  const [step, setStep] = useState("sources"); // sources | loading | questions | review | done
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState([]);
  const [profile, setProfile] = useState(emptyProfile());
  const [aiFields, setAiFields] = useState([]);
  const [visibility, setVisibility] = useState("members");
  const [prefs, setPrefs] = useState({ frequency: "off", topics: [] });
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [existing, setExisting] = useState(null);
  const [saved, setSaved] = useState(null);

  // Load newsletter choice from sign-up, and whether a profile already exists.
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from("newsletter_prefs").select("frequency, topics").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setPrefs({ frequency: data.frequency, topics: data.topics || [] }));
    supabase.from("profiles").select("slug").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => data && setExisting(data.slug));
  }, [supabase, user]);

  if (!configured) {
    return (
      <div className="stack">
        <h1>פרופיל שנבנה לבד</h1>
        <div className="notice">ההרשמה והפרופילים נפתחים בקרוב.</div>
        <HowTo />
      </div>
    );
  }
  if (user === undefined) return <p className="muted">טוען…</p>;
  if (!user) {
    return (
      <div className="stack">
        <h1>פרופיל שנבנה לבד</h1>
        <p className="muted">קודם נכנסים עם המייל. הקישור יחזיר אותך לכאן.</p>
        <div className="card"><SignupForm next="/onboard" /></div>
        <HowTo />
      </div>
    );
  }

  function startQuestions(draftProfile, missing) {
    setProfile(draftProfile);
    const q = [...missing, "visibility", "newsletter"];
    setQueue(q);
    setQi(0);
    setStep("questions");
  }

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
      startQuestions(emptyProfile(), REQUIRED);
      return;
    }
    setAiFields(out.ai_fields || []);
    startQuestions({ ...emptyProfile(), ...out.draft }, out.missing || []);
  }

  if (saved) {
    return (
      <div className="stack">
        <h1>הפרופיל מוכן 🎉</h1>
        <div className="notice ok">
          {visibility === "hidden" ? "הפרופיל שמור ומוסתר. אפשר לפרסם אותו מתי שרוצים." : "הפרופיל באוויר."}
        </div>
        <div className="row">
          <a className="btn primary" href={`/p/${saved.slug}`}>לפרופיל שלי</a>
          <a className="btn" href="/people">לאנשים בקהילה</a>
          <a className="btn" href="/map/app.html">למפה</a>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="stack">
        <Progress value={100} />
        <h1>בדיקה אחרונה</h1>
        <p className="muted">ככה הפרופיל ייראה. אפשר לתקן הכול. שום דבר לא נשמר עד שלוחצים על אישור.</p>
        <ProfileForm
          initial={{ profile, ai_fields: aiFields, visibility, prefs }}
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
    return (
      <div className="stack">
        <Progress value={40 + (60 * qi) / queue.length} />
        {error && qi === 0 && <div className="notice">{error}</div>}
        {notes.length > 0 && qi === 0 && notes.map((n) => <div key={n} className="notice">{NOTES[n]}</div>)}
        {qi === 0 && !error && aiFields.length > 0 && (
          <p className="muted">בנינו טיוטה ממה שנתת. נשארו {queue.length > 2 ? `${queue.length - 2} שאלות על מה שחסר, ועוד שתיים` : "שתי שאלות קצרות"}.</p>
        )}
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (answered) next(); }}>
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
          <div className="row" style={{ marginBlockStart: 18 }}>
            <button className="btn primary" disabled={!answered}>{qi + 1 < queue.length ? "הבא" : "לסיכום"}</button>
            {qi > 0 && <button type="button" className="btn" onClick={() => setQi(qi - 1)}>חזרה</button>}
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
      <h1>פרופיל שנבנה לבד</h1>
      {existing && (
        <div className="notice">
          כבר יש לך פרופיל. <a href="/me">לעריכה</a> או <a href={`/p/${existing}`}>לצפייה</a>. אפשר גם לבנות אותו מחדש כאן.
        </div>
      )}
      <p className="muted">תנו לנו נקודת פתיחה אחת או יותר. נבנה טיוטה, ונשאל רק על מה שחסר.</p>
      {error && <div className="notice err" role="alert">{error}</div>}
      <form onSubmit={build} className="card" aria-busy={loading}>
        <label className={`drop${file ? " has" : ""}`}>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file ? <b>📄 {file.name}</b> : <><b>העלאת קורות חיים או PDF של לינקדאין</b><br /><span className="small muted">PDF עד 10MB</span></>}
        </label>
        <details style={{ marginBlockStart: 10 }}>
          <summary className="small">איך מורידים PDF מהלינקדאין?</summary>
          <p className="small muted" style={{ marginBlockStart: 8 }}>
            לינקדאין לא מאפשר לאתרים אחרים לקרוא פרופילים, אז מורידים קובץ: בפרופיל שלך בלינקדאין (במחשב) לוחצים על
            <b> Resources</b> (או <b>More</b>) ← <b>Save to PDF</b>, ומעלים את הקובץ כאן.
          </p>
        </details>
        <div className="or">ו/או</div>
        <div className="field">
          <label htmlFor="ob-link">קישור לפורטפוליו</label>
          <p className="hint">Behance, Vimeo, ArtStation, אתר אישי</p>
          <input id="ob-link" type="url" dir="ltr" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ob-text">כמה מילים על עצמך</label>
          <textarea id="ob-text" placeholder="מה את/ה עושה, איפה עבדת, באילו כלים…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn primary" disabled={loading || (!file && !link.trim() && !text.trim())}>
            {loading ? <><span className="spinner" aria-hidden /> בונה טיוטה…</> : "בנו לי פרופיל"}
          </button>
          <button type="button" className="btn" disabled={loading} onClick={() => startQuestions(emptyProfile(), REQUIRED)}>
            אין לי, אמלא שאלון קצר
          </button>
        </div>
        {loading && <p className="small muted" role="status" style={{ marginBlockStart: 12 }}>קוראים את החומר ומחלצים תחומים, כלים וניסיון. זה לוקח עד חצי דקה.</p>}
      </form>
      <p className="small muted">
        הקבצים והקישורים משמשים רק לבניית הטיוטה. קורות החיים לא נשמרים אלא אם תבחרו בכך בסוף. <a href="/privacy">פרטיות</a>
      </p>
    </div>
  );
}

function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <div style={{ width: `${value}%` }} />
    </div>
  );
}

function HowTo() {
  return (
    <div className="card">
      <h3>איך זה עובד</h3>
      <ol className="muted" style={{ paddingInlineStart: 20, margin: 0 }}>
        <li>מעלים קורות חיים או PDF של הלינקדאין, ו/או קישור לפורטפוליו.</li>
        <li>ה־AI בונה טיוטה: תחומים, כלים, ניסיון וקישורים.</li>
        <li>שאלון קצר רק על מה שחסר.</li>
        <li>בודקים, מתקנים, ומחליטים מי רואה.</li>
      </ol>
    </div>
  );
}
