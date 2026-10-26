"use client";
import { useEffect, useState } from "react";

// An AI answer above the regular /search results (Claude over the published directory, /api/ask).
// Shown only when the server has an API key and the query reads like a question (lib/askable.js).
// One request per query per tab (cached in sessionStorage); any failure hides the box and the regular results stay.
const KEY = "creativein-ask:";

export default function AskAnswer({ q }) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY + q) || "null"); } catch {}
    if (cached) { setState({ status: "done", ...cached }); return; }
    const ctl = new AbortController();
    fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, lang: "he" }), signal: ctl.signal })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok || !j.summary) { setState({ status: j?.error === "rate_limited" ? "busy" : "off" }); return; }
        try { sessionStorage.setItem(KEY + q, JSON.stringify(j)); } catch {}
        setState({ status: "done", ...j });
      })
      .catch((e) => { if (e?.name !== "AbortError") setState({ status: "off" }); });
    return () => ctl.abort();
  }, [q]);

  if (state.status === "off") return null;
  return (
    <section className="askbox" aria-live="polite" aria-busy={state.status === "loading"}>
      <p className="asklabel"><span className="askdot" aria-hidden="true" />תשובה מהירה</p>
      {state.status === "loading" && <p className="askwait">מחפשים בכל הנתונים באתר…</p>}
      {state.status === "busy" && <p className="askwait">הרבה שאלות כרגע. נסו שוב בעוד כמה דקות; התוצאות הרגילות מופיעות למטה.</p>}
      {state.status === "done" && (
        <>
          <p className="asksum" dir="auto">{state.summary}</p>
          {state.results?.length > 0 && (
            <ol className="asklist">
              {state.results.map((r) => (
                <li key={r.id}>
                  <a href={`/companies/${encodeURIComponent(r.id)}`} data-track="ai_answer_click" data-track-label={r.id}><bdi>{r.name || r.id}</bdi></a>
                  {r.why && <span dir="auto"> · {r.why}</span>}
                </li>
              ))}
            </ol>
          )}
          {state.followups?.length > 0 && (
            <div className="popular askmore">
              {state.followups.map((f) => <a key={f} className="tag" href={`/search?q=${encodeURIComponent(f)}`} data-track="ai_followup_click">{f}</a>)}
            </div>
          )}
          <p className="askfine">נכתב בעזרת AI, מתוך המידע באתר בלבד. בדקו כל פרט במקור שלו בדף החברה.</p>
        </>
      )}
    </section>
  );
}
