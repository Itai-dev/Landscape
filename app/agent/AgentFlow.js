"use client";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { CheckIcon, LinkIcon } from "@/components/Icons";
import { readTrack, setTracked } from "@/lib/trackSync";

// The agent, test version. A short conversation (one sentence about you, a check of what we understood,
// what matters most now), the agent at work, then the briefing. Nothing is stored on the server: the profile
// stays in this browser, and the briefing is composed from the directory's published data.
const KEY = "landscape-agent";
const SEEN = "landscape-agent-seen"; // what the last briefing showed, for "מאז הביקור הקודם"
const FIRST = 12;
const tryTrack = (name, props) => { try { track(name, props); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
const follows = () => Object.keys(readTrack().pipeline || {});
const hebrewList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ו${xs[xs.length - 1]}`);
const post = (body) => fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export default function AgentFlow({ crafts: allCrafts, roles, goals: goalsByRole, home = false }) {
  const [phase, setPhase] = useState("loading"); // loading | intro | confirm | goals | working | brief
  const [log, setLog] = useState([]); // the conversation: { who: "agent" | "me", text }
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [crafts, setCrafts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [clients, setClients] = useState([]); // [{ id, name, on }] brands found on the reader's site
  const [self, setSelf] = useState(""); // the reader's own company, when it is on the map
  const [more, setMore] = useState(false);
  const [brief, setBrief] = useState(null);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const [ans, setAns] = useState(null); // the answer to a question ("שאלו את הסוכן")
  const [asking, setAsking] = useState(false);
  const endRef = useRef(null);
  const he = (slug) => allCrafts.find((c) => c.slug === slug)?.he || slug;
  const roleHe = (slug) => roles.find((r) => r.slug === slug)?.short || "";

  const say = (who, t) => setLog((l) => [...l, { who, text: t }]);
  async function ask(q) {
    q = String(q || "").trim();
    if (!q) return;
    setAsking(true);
    const p = load() || {};
    const a = await post({ action: "ask", q, role: p.role || "", crafts: p.crafts || [] });
    setAsking(false);
    setAns(a || { q, title: q, lead: "לא הצלחנו לענות עכשיו. נסו שוב בעוד רגע.", cards: [] });
    tryTrack("agent_ask", { cards: a?.cards?.length || 0 });
    try { const u = new URL(location.href); u.searchParams.set("q", q); history.replaceState(null, "", u); } catch {}
  }
  function closeAnswer() {
    setAns(null);
    try { const u = new URL(location.href); u.searchParams.delete("q"); history.replaceState(null, "", u); } catch {}
  }
  useEffect(() => {
    try { const q = new URLSearchParams(location.search).get("q"); if (q) ask(q); } catch {}
    const p = load();
    if (p?.role) { setRole(p.role); setCrafts(p.crafts || []); setGoals(p.goals || []); setSelf(p.self || ""); work(p, true); }
    else { setPhase("intro"); setLog([{ who: "agent", text: "היי. אנחנו הסוכן של CreativeIn: סורקים כל יום את תעשיית הקריאייטיב בישראל, בודקים כל פרט מול המקור, ומביאים לכם רק את מה שרלוונטי." }, { who: "agent", text: "ספרו במשפט אחד מה אתם עושים, או הדביקו קישור לאתר או לפורטפוליו." }]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [log, phase, steps.length]);

  async function sendIntro(e) {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    say("me", t);
    setText("");
    if (/^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(t)) return readSite(t);
    const r = await post({ action: "read", text: t });
    const r0 = r?.role || "", c0 = r?.crafts || [];
    setRole(r0 || "studio"); setCrafts(c0);
    tryTrack("agent_intro", { role: r0 || "none", crafts: c0.length });
    say("agent", c0.length || r0
      ? "הבנו ככה. תקנו אם צריך:"
      : "לא הצלחנו להבין מהמשפט במה אתם עובדים. בחרו כאן:");
    setPhase("confirm");
  }
  async function readSite(url) {
    say("agent", "קוראים את האתר…");
    setPhase("reading");
    const r = await post({ action: "site", url });
    const host = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    tryTrack("agent_site", { ok: Boolean(r?.ok), found: Boolean(r?.found), clients: r?.clients?.length || 0 });
    if (!r?.ok) {
      setRole("studio"); setCrafts([]); setClients([]);
      say("agent", `לא הצלחנו לקרוא את ${host}. יש אתרים שלא נותנים לקרוא אותם. ספרו במשפט מה אתם עושים, או בחרו כאן:`);
      setPhase("confirm");
      return;
    }
    setRole(r.role || "studio"); setCrafts(r.crafts || []); setSelf(r.found?.id || "");
    setClients((r.clients || []).map((c) => ({ ...c, on: true })));
    say("agent", r.found ? `מצאנו אתכם במפה: ${r.found.name}. ככה אנחנו מכירים אתכם, תקנו אם צריך:` : `קראנו את ${host}. ככה הבנו, תקנו אם צריך:`);
    if (r.clients?.length) say("agent", `זיהינו לקוחות: ${hebrewList(r.clients.slice(0, 4).map((c) => c.name))}${r.clients.length > 4 ? " ועוד" : ""}. נעקוב אחריהם בשבילכם.`);
    setPhase("confirm");
  }
  function pickList() {
    say("me", "אבחר מהרשימה");
    setRole("studio"); setCrafts([]);
    say("agent", "בחרו מה מתאים לכם:");
    setPhase("confirm");
  }
  function confirm() {
    say("me", `${roleHe(role)}${crafts.length ? `, ${hebrewList(crafts.slice(0, 4).map(he))}` : ""}`);
    say("agent", "ומה הכי חשוב לכם עכשיו?");
    setGoals([]);
    setPhase("goals");
  }
  function start() {
    const g = goals.length ? goals : (goalsByRole[role] || []).slice(0, 1).map((x) => x.slug);
    say("me", hebrewList(g.map((x) => (goalsByRole[role] || []).find((y) => y.slug === x)?.he || x)));
    const p = { role, crafts, goals: g, clients: clients.filter((c) => c.on).map((c) => c.id), self };
    save(p);
    tryTrack("agent_start", { role, crafts: crafts.length, goals: g.join(",") });
    work(p, false);
  }

  async function work(p, again) {
    setPhase("working"); setError(""); setSteps([]);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const req = post({ action: "brief", role: p.role, crafts: p.crafts, goals: p.goals, follows: follows(), clients: p.clients || [], self: p.self || "" });
    const b = await req;
    if (!b) { setError("לא הצלחנו להכין את התדריך. נסו שוב בעוד רגע."); setPhase(again ? "brief" : "goals"); return; }
    const lines = [
      `קוראים ${b.stats.signals} עדכונים מ־${b.stats.days} הימים האחרונים`,
      `בודקים ${b.stats.tenders} מכרזים מול התחומים שלכם`,
      `עוברים על ${b.stats.orgs} חברות בתעשייה`,
      `מצאנו ${b.count} דברים בשבילכם`,
    ];
    for (let i = 0; i < lines.length; i++) { setSteps((s) => [...s, lines[i]]); await wait(again ? 120 : 650); }
    setBrief(b);
    tryTrack("agent_brief", { role: p.role, count: b.count });
    await wait(again ? 0 : 300);
    setPhase("brief");
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch {}
    setBrief(null); setRole(""); setCrafts([]); setGoals([]); setSteps([]); setMore(false); setClients([]); setSelf("");
    setLog([{ who: "agent", text: "בואו נתחיל מחדש. ספרו במשפט אחד מה אתם עושים, או הדביקו קישור לאתר או לפורטפוליו." }]);
    setPhase("intro");
    window.scrollTo({ top: 0 });
  }

  const toggle = (list, set, slug) => set(list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug]);
  const shown = more ? allCrafts : [...allCrafts.slice(0, FIRST), ...allCrafts.slice(FIRST).filter((c) => crafts.includes(c.slug))];

  const askProps = { ans, asking, onAsk: ask, onClose: closeAnswer, crafts: (brief?.profile?.crafts || []).map((c) => c.he) };
  if (phase === "brief" && brief) return <Brief b={brief} onReset={reset} error={error} ask={askProps} />;
  return (
    <div className="agent">
      <div className="wrap awrap">
        {(ans || asking) && <Answer {...askProps} invite />}
        <p className="eyebrow">{home ? "הסוכן של CreativeIn" : "הסוכן של CreativeIn · גרסת ניסיון"}</p>
        <ol className="achat" aria-live="polite">
          {log.map((m, i) => <li key={i} className={`m-${m.who}`}>{m.text}</li>)}
        </ol>

        {phase === "intro" && (
          <form className="aform" onSubmit={sendIntro}>
            <label className="sr-only" htmlFor="intro">מה אתם עושים</label>
            <input id="intro" type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoComplete="off"
              placeholder="לדוגמה: סטודיו למושן ומיתוג, או studio.co.il" autoFocus />
            <button className="btn primary" disabled={!text.trim()}>שליחה</button>
            <button type="button" className="tap ajump" onClick={pickList}>אפשר גם לבחור מרשימה</button>
          </form>
        )}

        {phase === "reading" && <ol className="awork"><li className="run"><span className="spinner" aria-hidden /><span>קוראים את הדף ומחפשים אתכם במפה…</span></li></ol>}

        {phase === "confirm" && (
          <section className="apanel" aria-label="מה הבנו">
            <span className="label">מי אתם</span>
            <div className="chips" role="radiogroup" aria-label="מי אתם">
              {roles.map((r) => (
                <label key={r.slug} className={`chip${role === r.slug ? " on" : ""}`}>
                  <input type="radio" name="role" checked={role === r.slug} onChange={() => setRole(r.slug)} />{r.he}
                </label>
              ))}
            </div>
            <span className="label">במה אתם עובדים</span>
            <div className="chips" role="group" aria-label="תחומים">
              {shown.map((c) => (
                <button key={c.slug} type="button" className={`chip${crafts.includes(c.slug) ? " on" : ""}`} aria-pressed={crafts.includes(c.slug)} onClick={() => toggle(crafts, setCrafts, c.slug)}>{c.he}</button>
              ))}
              {!more && allCrafts.length > FIRST && <button type="button" className="tap ajump" onClick={() => setMore(true)}>עוד תחומים</button>}
            </div>
            {clients.length > 0 && <>
              <span className="label">לקוחות לעקוב אחריהם</span>
              <div className="chips" role="group" aria-label="לקוחות">
                {clients.map((c) => (
                  <button key={c.id} type="button" className={`chip${c.on ? " on" : ""}`} aria-pressed={c.on} onClick={() => setClients(clients.map((x) => (x.id === c.id ? { ...x, on: !x.on } : x)))}>{c.name}</button>
                ))}
              </div>
            </>}
            <div><button type="button" className="btn primary lg" onClick={confirm}>זה נכון</button></div>
          </section>
        )}

        {phase === "goals" && (
          <section className="apanel" aria-label="מה חשוב עכשיו">
            <div className="chips" role="group" aria-label="מה חשוב עכשיו">
              {(goalsByRole[role] || []).map((g) => (
                <button key={g.slug} type="button" className={`chip${goals.includes(g.slug) ? " on" : ""}`} aria-pressed={goals.includes(g.slug)} onClick={() => toggle(goals, setGoals, g.slug)}>{g.he}</button>
              ))}
            </div>
            {error && <div className="notice err" role="alert">{error}</div>}
            <div><button type="button" className="btn primary lg" onClick={start}>הכנת התדריך שלי</button></div>
          </section>
        )}

        {phase === "working" && (
          <ol className="awork" aria-live="polite">
            {steps.map((s, i) => (
              <li key={i} className={i === steps.length - 1 && i < 3 ? "run" : "done"}>
                {i === steps.length - 1 && i < 3 ? <span className="spinner" aria-hidden /> : <CheckIcon size={16} />}<span>{s}</span>
              </li>
            ))}
            {!steps.length && <li className="run"><span className="spinner" aria-hidden /><span>מתחילים לעבוד…</span></li>}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ---------- the briefing ----------
function Brief({ b, onReset, error, ask }) {
  const p = b.profile;
  const date = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(new Date());
  // Since the last visit: what this briefing shows that the last one didn't.
  const ids = [...b.opportunities, ...b.updates].map((x) => x.id);
  const [since, setSince] = useState(null); // { days, fresh: Set }
  useEffect(() => {
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(SEEN) || "null"); } catch {}
    if (prev?.at && Array.isArray(prev.ids)) {
      const days = Math.floor((Date.now() - Date.parse(prev.at)) / 864e5);
      const seen = new Set(prev.ids);
      setSince({ days, fresh: new Set(ids.filter((id) => !seen.has(id))) });
    }
    const t = setTimeout(() => { try { localStorage.setItem(SEEN, JSON.stringify({ at: new Date().toISOString(), ids })); } catch {} }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);
  const fresh = (id) => Boolean(since?.fresh.has(id));
  // Saving the agent: the clients join the tracking list (it joins the account at sign-in), the crafts ride to sign-up.
  function saveAgent() {
    const prof = load() || {};
    for (const id of prof.clients || []) setTracked(id, true);
    tryTrack("agent_save", { crafts: p.crafts.length, clients: (prof.clients || []).length });
    location.href = `/join${p.crafts.length ? `?crafts=${p.crafts.map((c) => c.slug).join(",")}` : ""}`;
  }
  return (
    <div className="agent">
      <div className="wrap awrap brief">
        <header className="bhead">
          <p className="eyebrow">התדריך שלכם · {date}</p>
          <h1>מה השתנה בשבילכם</h1>
          <p className="muted">
            {p.role_he}{p.crafts.length ? `, ${hebrewList(p.crafts.slice(0, 4).map((c) => c.he))}` : ""}. מתוך {b.stats.signals} עדכונים ו־{b.stats.tenders} מכרזים מהחודשיים האחרונים, בחרנו {b.count}. כל פריט נבדק מול המקור.
          </p>
          {since && <p className="bsince">{since.fresh.size ? `מאז הביקור הקודם${since.days > 0 ? ` (לפני ${since.days === 1 ? "יום" : `${since.days} ימים`})` : ""}: ${since.fresh.size === 1 ? "דבר אחד חדש" : `${since.fresh.size} דברים חדשים`}, מסומנים ב״חדש״.` : "אין חדש מאז הביקור הקודם. נמשיך לבדוק בשבילכם."}</p>}
          <button type="button" className="btn ghost sm" onClick={onReset} data-track="agent_reset">שינוי ההגדרות</button>
        </header>
        <AskBar {...ask} />
        {(ask.ans || ask.asking) && <Answer {...ask} />}
        {error && <div className="notice err" role="alert">{error}</div>}

        {b.opportunities.length > 0 && (
          <section className="bsec" aria-labelledby="b-opp">
            <h2 id="b-opp">הזדמנויות פתוחות</h2>
            <ul className="blist">{b.opportunities.map((o) => <Opp key={o.id} o={o} fresh={fresh(o.id)} />)}</ul>
          </section>
        )}

        {b.updates.length > 0 && (
          <section className="bsec" aria-labelledby="b-upd">
            <h2 id="b-upd">עדכונים בשבילכם</h2>
            <ul className="blist">{b.updates.map((u) => <Update key={u.id} u={u} p={p} fresh={fresh(u.id)} />)}</ul>
          </section>
        )}
        {!b.count && (
          <section className="bsec">
            <h2>עוד אין כאן עדכונים בשבילכם</h2>
            <p className="muted">לא מצאנו עדכונים מהחודשיים האחרונים בתחומים שבחרתם. אפשר להוסיף תחומים, ונמשיך לבדוק בשבילכם.</p>
            <button type="button" className="btn" onClick={onReset}>שינוי ההגדרות</button>
          </section>
        )}

        {b.companies.length > 0 && (
          <section className="bsec" aria-labelledby="b-co">
            <h2 id="b-co">חברות שמזמינות {p.crafts.length ? hebrewList(p.crafts.slice(0, 2).map((c) => c.he)) : "את מה שאתם עושים"}</h2>
            <ul className="bco">{b.companies.map((c) => (
              <li key={c.org.id} className="acard">
                <div className="bco-top">{c.org.logo ? <img src={c.org.logo} alt="" width="40" height="40" /> : <span className="bco-ph" aria-hidden>{c.org.name.slice(0, 1)}</span>}<b>{c.org.name}</b></div>
                {c.reason && <p className="small">{c.reason}</p>}
                <div className="bact"><a className="btn sm" href={c.org.href} data-track="agent_company">לעמוד החברה</a><Track id={c.org.id} /></div>
              </li>
            ))}</ul>
          </section>
        )}

        <section className="bsec bmission" aria-labelledby="b-mis">
          <h2 id="b-mis">מה נמשיך לעשות בשבילכם</h2>
          <ul className="bmis">{b.missions.map((m) => <li key={m.text} className={m.live ? "" : "soon"}>{m.live ? <CheckIcon size={16} /> : <span className="bsoon">בקרוב</span>}<span>{m.text}</span></li>)}</ul>
          <div className="bcta">
            <button type="button" className="btn primary lg" onClick={saveAgent}>שמירת הסוכן שלי</button>
            <p className="small muted">חשבון חינם: התדריך במייל ביום ראשון, והתראה כשמשהו זז אצל החברות שלכם. אפשר להפסיק בכל רגע.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Opp({ o, fresh = false }) {
  return (
    <li className="acard">
      <p className="blabel"><span className={o.kind === "tender" && o.state === "open" ? "mark" : ""}>{o.label}</span>{o.day ? ` · ${o.day}` : ""}{fresh ? <span className="bnew">חדש</span> : null}</p>
      <h3>{o.title}</h3>
      {o.summary && <p className="small">{o.summary}</p>}
      <p className="bmeta small">
        {o.kind === "tender" ? <>{o.buyer} · {o.when} · <span className={o.urgent ? "pill-urgent" : ""}>{o.countdown}</span></> : o.org?.name}
        {o.crafts?.length ? <> · בתחום שלכם: {o.crafts.join(", ")}</> : null}
      </p>
      <Facts facts={o.facts} />
      <div className="bact">
        {o.source_url && <a className="btn sm" href={o.source_url} target="_blank" rel="noopener" data-track={o.kind === "tender" ? "tender_source_click" : o.kind === "news" ? "agent_news_source" : "opportunity_source_click"}>{o.kind === "tender" ? "לפרסום הרשמי" : o.kind === "news" ? (o.source ? `לפרסום ב־${o.source}` : "למקור") : `למשרה ב־${o.source}`}<LinkIcon size={14} /></a>}
        {o.kind === "news" && o.org?.href && <a className="btn ghost sm" href={o.org.href}>לעמוד החברה</a>}
        {o.calendar && <a className="btn ghost sm" href={o.calendar} target="_blank" rel="noopener" data-track="agent_calendar">הוספה ליומן</a>}
        {o.kind === "tender" && o.buyer_href && <a className="btn ghost sm" href={o.buyer_href}>לעמוד הגוף המזמין</a>}
      </div>
    </li>
  );
}

function Update({ u, p, fresh = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const crafts = hebrewList(p.crafts.slice(0, 3).map((c) => c.he));
  const who = (u.facts || []).find((f) => f.k === "בשיווק")?.v.split(" ")[0] || "";
  const what = u.label.split(" · ")[1] || "עדכון";
  const fit = u.fit ? `\nראיתי שאתם מזמינים ${u.fit}, וזה בדיוק מה שאנחנו עושים.` : "";
  const draft = u.org ? (p.role === "freelance"
    ? `היי${who ? ` ${who}` : ""},\nראיתי את העדכון על ${u.org.name} (${what}).${fit.replace("שאנחנו עושים", "שאני עושה")}\nאני עושה ${crafts || "עבודה קריאייטיבית"} באופן עצמאי. אם זה רלוונטי עכשיו או בהמשך, אשמח לשיחה קצרה ולהראות כמה עבודות.\n\nתודה,`
    : `היי${who ? ` ${who}` : ""},\nראינו את העדכון על ${u.org.name} (${what}).${fit.replace("ראיתי", "ראינו")}\nאנחנו ${p.role === "studio" ? "סטודיו" : "צוות"} ${crafts ? `ל${crafts}` : "קריאייטיב"}. אם זה רלוונטי עכשיו או בהמשך, נשמח לשיחה קצרה ולהראות כמה עבודות.\n\nתודה,`) : "";
  async function copy() {
    try { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <li className="acard">
      <p className="blabel"><span>{u.label}</span> · {u.day}{fresh ? <span className="bnew">חדש</span> : null}{u.client ? <span className="btag">הלקוח שלכם</span> : u.followed ? <span className="btag">במעקב שלכם</span> : null}</p>
      <h3>{u.headline}</h3>
      <div className="bwhy">
        <b>למה זה רלוונטי לכם</b>
        <p>{u.why}{u.crafts.length ? ` נוגע בתחום שלכם: ${u.crafts.join(", ")}.` : ""}</p>
      </div>
      <Facts facts={u.facts} title={`מה אנחנו יודעים על ${u.org?.name || "החברה"}`} />
      <div className="bact">
        {u.source_url && <a className="btn sm" href={u.source_url} target="_blank" rel="noopener" data-track="agent_source">לפרסום ב־{u.source}<LinkIcon size={14} /></a>}
        {u.org?.href && <a className="btn ghost sm" href={u.org.href} data-track="agent_company">לעמוד החברה</a>}
        {u.draft && <button type="button" className="btn ghost sm" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) tryTrack("agent_draft", { type: u.type }); }}>טיוטת פנייה</button>}
        {u.org?.id && <Track id={u.org.id} />}
      </div>
      {open && (
        <div className="bdraft">
          <label className="small muted" htmlFor={`d-${u.id}`}>טיוטה לעריכה. שום דבר לא נשלח מכאן.</label>
          <textarea id={`d-${u.id}`} defaultValue={draft} rows={6} />
          <div><button type="button" className="btn sm" onClick={copy}>{copied ? "הועתק" : "העתקת הטיוטה"}</button></div>
        </div>
      )}
    </li>
  );
}

// "שאלו את הסוכן": a question about the industry, answered from the map.
function AskBar({ onAsk, crafts = [] }) {
  const [q, setQ] = useState("");
  const ex = [crafts[0] ? `מי מזמין ${crafts[0]}?` : "מי מזמין מושן?", "אילו מכרזים פתוחים?", "מי עובד עם ישראכרט?"];
  return (
    <section className="ask" aria-label="שאלו את הסוכן">
      <form className="aform" onSubmit={(e) => { e.preventDefault(); onAsk(q); }}>
        <label className="sr-only" htmlFor="askq">שאלה לסוכן</label>
        <input id="askq" type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} autoComplete="off" placeholder="שאלו את הסוכן: מי מזמין, מי עובד עם מי, אילו מכרזים" />
        <button className="btn primary" disabled={!q.trim()}>שאלה</button>
      </form>
      <div className="chips askex">{ex.map((x) => <button key={x} type="button" className="chip" onClick={() => { setQ(x); onAsk(x); }}>{x}</button>)}</div>
    </section>
  );
}

function Answer({ ans, asking, onClose, invite = false }) {
  if (asking && !ans) return <ol className="awork"><li className="run"><span className="spinner" aria-hidden /><span>מחפשים במפה…</span></li></ol>;
  if (!ans) return null;
  return (
    <section className="answer" aria-live="polite" aria-labelledby="ans-t">
      <div className="ans-top">
        <div><p className="eyebrow">תשובה מהמפה</p><h2 id="ans-t">{ans.title}</h2></div>
        <button type="button" className="btn ghost sm" onClick={onClose}>סגירה</button>
      </div>
      {ans.lead && <p className="ans-lead">{ans.lead}</p>}
      {ans.cards?.length > 0 && <ul className="blist">{ans.cards.map((c) => (c.kind === "org" ? <OrgCard key={c.org.id} c={c} /> : <Opp key={c.id} o={c} />))}</ul>}
      {ans.more && <a className="btn ghost sm" href={ans.more.href}>{ans.more.label}</a>}
      {invite && <p className="small muted">רוצים תדריך אישי, עם מה שרלוונטי רק לכם? ספרו לסוכן מה אתם עושים, כאן למטה.</p>}
    </section>
  );
}

function OrgCard({ c }) {
  return (
    <li className="acard">
      <div className="bco-top">{c.org.logo ? <img src={c.org.logo} alt="" width="40" height="40" /> : <span className="bco-ph" aria-hidden>{c.org.name.slice(0, 1)}</span>}
        <div><b>{c.org.name}</b><p className="small muted">{c.org.kind_he}{c.org.city ? ` · ${c.org.city}` : ""}</p></div></div>
      {c.latest && <p className="small"><b>העדכון האחרון ({c.latest.day}):</b> {c.latest.headline}{c.latest.source_url ? <> · <a href={c.latest.source_url} target="_blank" rel="noopener">{c.latest.source || "מקור"}</a></> : null}</p>}
      <Facts facts={c.facts} title="מה אנחנו יודעים" />
      <div className="bact"><a className="btn sm" href={c.org.href} data-track="agent_company">לעמוד החברה</a><Track id={c.org.id} /></div>
    </li>
  );
}

// What the map knows about this company: the part a general AI agent doesn't have.
function Facts({ facts, title = "מהמפה של CreativeIn" }) {
  if (!facts?.length) return null;
  return (
    <div className="bfacts">
      <b className="bfacts-t">{title}</b>
      <dl>{facts.map((f) => (
        <div key={f.k}><dt>{f.k}</dt><dd>{f.v}{f.href ? <> · <a href={f.href} target="_blank" rel="noopener" className="small">מקור</a></> : null}</dd></div>
      ))}</dl>
    </div>
  );
}

function Track({ id }) {
  const [on, setOn] = useState(null);
  useEffect(() => { setOn(Boolean(readTrack().pipeline?.[id])); }, [id]);
  if (on === null) return null;
  return (
    <button type="button" className="btn ghost sm" aria-pressed={on} data-track="agent_track"
      onClick={() => { if (setTracked(id, !on)) { setOn(!on); window.dispatchEvent(new Event("creativein-track-local")); } }}>
      {on ? <><CheckIcon size={14} />במעקב</> : "מעקב אחרי החברה"}
    </button>
  );
}
