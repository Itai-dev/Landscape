"use client";
import { useState } from "react";
import { CRAFTS, CITIES, OPEN_TO, VISIBILITY, FREQUENCIES, TOPICS } from "@/lib/taxonomy";

const AiTag = ({ on }) => (on ? <span className="ai" title="מולא אוטומטית מהחומר שהעליתם. כדאי לבדוק.">✦ מולא אוטומטית</span> : null);

export function Chips({ options, value, onChange, name }) {
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

export function Radios({ options, value, onChange, name }) {
  return (
    <div className="stack" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <label key={o.slug} className="check">
          <input type="radio" name={name} checked={value === o.slug} onChange={() => onChange(o.slug)} />
          <span>
            <b>{o.he}</b>
            {o.hint ? <span className="muted"> · {o.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export const emptyProfile = () => ({
  name: "", headline: "", bio: "", city: "", crafts: [], skills: [], open_to: [],
  portfolio_url: "", links: [], experience: [],
});

// Full editable profile. Used for the onboarding review step and for /me.
export default function ProfileForm({ initial, cvFile = null, submitLabel = "שמירה", onSaved }) {
  const [p, setP] = useState({ ...emptyProfile(), ...initial.profile });
  const [ai, setAi] = useState(new Set(initial.ai_fields || []));
  const [visibility, setVisibility] = useState(initial.visibility || "members");
  const [prefs, setPrefs] = useState(initial.prefs || { frequency: "off", topics: [] });
  const [keepCv, setKeepCv] = useState(false);
  const [skillsText, setSkillsText] = useState((initial.profile?.skills || []).join(", "));
  const [state, setState] = useState({ busy: false, error: "" });
  const claimedFrom = initial.claimed_from || null;

  const untag = (k) =>
    setAi((cur) => {
      const n = new Set(cur);
      n.delete(k);
      return n;
    });
  const set = (k, v) => {
    setP((cur) => ({ ...cur, [k]: v }));
    untag(k);
  };

  async function save(e) {
    e.preventDefault();
    setState({ busy: true, error: "" });
    const profile = { ...p, skills: skillsText.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean) };
    const body = new FormData();
    body.set("data", JSON.stringify({ profile, visibility, ai_fields: [...ai], prefs, claimed_from: claimedFrom }));
    if (cvFile && keepCv) body.set("cv", cvFile);
    const res = await fetch("/api/profile", { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        out.error === "missing" ? "חסרים שדות חובה: שם, כותרת, תחום, עיר וזמינות." :
        out.error === "sign_in" ? "צריך להתחבר מחדש." : "השמירה נכשלה. נסו שוב.";
      setState({ busy: false, error: msg });
      return;
    }
    setState({ busy: false, error: "" });
    onSaved?.(out);
  }

  const setLink = (i, k, v) => set("links", p.links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const setExp = (i, k, v) => set("experience", p.experience.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <form onSubmit={save}>
      <div className="card">
        <div className="field">
          <label htmlFor="pf-name">שם <AiTag on={ai.has("name")} /></label>
          <input id="pf-name" type="text" required value={p.name || ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-headline">כותרת <AiTag on={ai.has("headline")} /></label>
          <p className="hint">שורה אחת על מה שעושים. למשל: מושן דיזיין ואנימציית תלת־ממד</p>
          <input id="pf-headline" type="text" required value={p.headline || ""} onChange={(e) => set("headline", e.target.value)} />
        </div>
        <div className="field">
          <label>תחומים <AiTag on={ai.has("crafts")} /></label>
          <Chips name="תחומים" options={CRAFTS} value={p.crafts} onChange={(v) => set("crafts", v)} />
        </div>
        <div className="field">
          <label htmlFor="pf-city">עיר <AiTag on={ai.has("city")} /></label>
          <input id="pf-city" type="text" list="cities" value={p.city || ""} onChange={(e) => set("city", e.target.value)} />
          <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field">
          <label>זמינות <AiTag on={ai.has("open_to")} /></label>
          <Chips name="זמינות" options={OPEN_TO} value={p.open_to} onChange={(v) => set("open_to", v)} />
        </div>
        <div className="field">
          <label htmlFor="pf-bio">כמה מילים עליכם <AiTag on={ai.has("bio")} /></label>
          <textarea id="pf-bio" value={p.bio || ""} onChange={(e) => set("bio", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-skills">כלים ומיומנויות <AiTag on={ai.has("skills")} /></label>
          <p className="hint">מופרדים בפסיקים</p>
          <input id="pf-skills" type="text" dir="auto" value={skillsText}
            onChange={(e) => { setSkillsText(e.target.value); untag("skills"); }} />
        </div>
        <div className="field">
          <label htmlFor="pf-portfolio">פורטפוליו / שואוריל <AiTag on={ai.has("portfolio_url")} /></label>
          <input id="pf-portfolio" type="url" dir="ltr" placeholder="https://" value={p.portfolio_url || ""} onChange={(e) => set("portfolio_url", e.target.value)} />
        </div>

        <div className="field">
          <label>קישורים <AiTag on={ai.has("links")} /></label>
          <div className="stack">
            {p.links.map((l, i) => (
              <div className="row" key={i}>
                <input type="text" dir="auto" aria-label="שם הקישור" placeholder="Behance" style={{ flex: "1 1 120px" }} value={l.label} onChange={(e) => setLink(i, "label", e.target.value)} />
                <input type="url" aria-label="כתובת" dir="ltr" placeholder="https://" style={{ flex: "3 1 220px" }} value={l.url} onChange={(e) => setLink(i, "url", e.target.value)} />
                <button type="button" className="btn" aria-label="הסרת קישור" onClick={() => set("links", p.links.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set("links", [...p.links, { label: "", url: "" }])}>+ קישור</button>
          </div>
        </div>

        <div className="field">
          <label>ניסיון <AiTag on={ai.has("experience")} /></label>
          <div className="stack">
            {p.experience.map((x, i) => (
              <div className="row" key={i}>
                <input type="text" dir="auto" aria-label="מקום" placeholder="סטודיו / חברה" style={{ flex: "2 1 160px" }} value={x.org || ""} onChange={(e) => setExp(i, "org", e.target.value)} />
                <input type="text" dir="auto" aria-label="תפקיד" placeholder="תפקיד" style={{ flex: "2 1 140px" }} value={x.role || ""} onChange={(e) => setExp(i, "role", e.target.value)} />
                <input type="text" aria-label="משנה" placeholder="מ־" className="mono" style={{ flex: "1 1 70px" }} value={x.start || ""} onChange={(e) => setExp(i, "start", e.target.value)} />
                <input type="text" aria-label="עד" placeholder="עד" className="mono" style={{ flex: "1 1 70px" }} value={x.end || ""} onChange={(e) => setExp(i, "end", e.target.value)} />
                <button type="button" className="btn" aria-label="הסרה" onClick={() => set("experience", p.experience.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set("experience", [...p.experience, { org: "", role: "", start: "", end: "" }])}>+ מקום עבודה</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBlockStart: 16 }}>
        <div className="field">
          <label>מי רואה את הפרופיל</label>
          <Radios name="visibility" options={VISIBILITY} value={visibility} onChange={setVisibility} />
        </div>
        <div className="field">
          <label htmlFor="pf-freq">ניוזלטר</label>
          <select id="pf-freq" value={prefs.frequency} onChange={(e) => setPrefs({ ...prefs, frequency: e.target.value })}>
            {FREQUENCIES.map((f) => <option key={f.slug} value={f.slug}>{f.he}</option>)}
          </select>
        </div>
        {prefs.frequency !== "off" && (
          <div className="field">
            <label>על מה לעדכן</label>
            <Chips name="נושאים" options={TOPICS} value={prefs.topics} onChange={(v) => setPrefs({ ...prefs, topics: v })} />
          </div>
        )}
        {cvFile && (
          <label className="check">
            <input type="checkbox" checked={keepCv} onChange={(e) => setKeepCv(e.target.checked)} />
            <span>לשמור את קובץ קורות החיים בחשבון (פרטי, רק לבעלי החשבון). בלי סימון, הקובץ לא נשמר.</span>
          </label>
        )}
      </div>

      {state.error && <div className="notice err" role="alert" style={{ marginBlockStart: 16 }}>{state.error}</div>}
      <div className="row" style={{ marginBlockStart: 16 }}>
        <button className="btn primary" disabled={state.busy}>
          {state.busy ? <span className="spinner" aria-hidden /> : null}
          {submitLabel}
        </button>
        {ai.size > 0 && <span className="small muted">שדות עם ✦ מולאו אוטומטית. כדאי לעבור עליהם.</span>}
      </div>
    </form>
  );
}
