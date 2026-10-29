"use client";
import { useState } from "react";
import { PLANS, FREE_FOLLOWS, cancelOutcome, shekels } from "@/lib/premium";

const day = (iso) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });

// "פרימיום" in the personal area: the plan, cancelling it in one step, and list export.
export default function PlanClient({ premium, paywall = true, sub, options }) {
  const [state, setState] = useState(sub);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ type: "companies", kind: "", city: "", category: "", mine: "" });

  async function cancel() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/billing/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) })).catch(() => ({ ok: false }));
    setBusy(false);
    setConfirm(false);
    if (res.ok) {
      setState({ ...state, status: "canceled", cancel_at_period_end: true, current_period_end: res.until || state.current_period_end, refund_amount: res.refund || null });
      setMsg(res.refund > 0 ? `נחזיר ${shekels(res.refund)} לכרטיס בתוך 14 יום. שלחנו לכם מייל אישור.` : "שלחנו לכם מייל אישור.");
    } else setMsg("לא הצלחנו לבטל כרגע. נסו שוב בעוד כמה דקות, או כתבו לנו ונבטל בעצמנו.");
  }

  // What cancelling now would do, said before the person confirms (lib/premium.js holds the rules).
  function preview() {
    const o = cancelOutcome(state);
    if (o.kind === "full") return `ההצטרפות הייתה לפני פחות מ־14 יום, אז נחזיר את כל הסכום, ${shekels(o.refund)}, והפרימיום ייסגר עכשיו.`;
    if (o.kind === "prorata") return `לא נחייב יותר, ונחזיר ${shekels(o.refund)} על ${o.months === 1 ? "חודש אחד" : `${o.months} חודשים`} שעוד לא התחילו. הפרימיום יישאר פעיל עד ${day(o.until)}.`;
    return `לא נחייב יותר, והפרימיום יישאר פעיל עד ${day(o.until)}.`;
  }

  if (!premium) {
    return (
      <div className="card stack" id="plan">
        <h2>פרימיום</h2>
        <p className="muted">{paywall ? `בחינם אפשר לעקוב אחרי עד ${FREE_FOLLOWS} חברות. ` : ""}פרימיום מוסיף מעקב בלי הגבלה, התראות בתוך שעה, ייצוא רשימות וחיפוש עם AI, ב־{shekels(PLANS.monthly.price)} לחודש.</p>
        <div><a className="btn primary" href="/premium" data-track="premium_upsell" data-track-where="me">לפרימיום</a></div>
      </div>
    );
  }

  const href = `/api/export?${new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString()}`;
  const plan = PLANS[state?.plan];
  const ended = state?.status === "canceled" && new Date(state.current_period_end) <= new Date();
  return (
    <div className="card stack" id="plan">
      <h2>פרימיום <span className="count">{plan ? plan.label : ""}</span></h2>
      {state?.status === "canceled" ? (
        ended
          ? <p>המנוי בוטל, והפרימיום נסגר.</p>
          : <p>המנוי בוטל, ולא נחייב יותר. הפרימיום פעיל עד {day(state.current_period_end)}.</p>
      ) : state?.status === "past_due" ? (
        <p>החיוב האחרון לא עבר, וננסה שוב בימים הקרובים. כדאי לבדוק את פרטי הכרטיס אצל חברת האשראי.</p>
      ) : (
        <p>{plan ? `${shekels(plan.price)} ${plan.per}` : ""}. החיוב הבא ב־{day(state.current_period_end)}.</p>
      )}

      {!ended && (<>
      <h3 className="sub">ייצוא רשימות</h3>
      <p className="muted small">קובץ CSV שנפתח באקסל, עם מה שכבר מופיע באתר ועם המקור לכל איש מפתח. לשימוש מקצועי אישי בלבד: אסור לשלוח לאנשים שברשימה דיוור שיווקי בלי הסכמתם, ואסור למכור או להעביר את הרשימה. <a href="/terms#use">לכללים המלאים</a></p>
      <div className="prexport">
        <label><span className="label">מה להוריד</span>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="companies">חברות</option>
            <option value="people">אנשי מפתח</option>
          </select>
        </label>
        <label><span className="label">סוג חברה</span>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="">הכול</option>
            {options.kinds.map((k) => <option key={k.slug} value={k.slug}>{k.he}</option>)}
          </select>
        </label>
        <label><span className="label">תחום</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">הכול</option>
            {options.categories.map((c) => <option key={c.slug} value={c.slug}>{c.he}</option>)}
          </select>
        </label>
        <label><span className="label">עיר</span>
          <select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
            <option value="">הכול</option>
            {options.cities.map((c) => <option key={c.slug} value={c.slug}>{c.he}</option>)}
          </select>
        </label>
        <label className="check small"><input type="checkbox" checked={f.mine === "1"} onChange={(e) => setF({ ...f, mine: e.target.checked ? "1" : "" })} /><span>רק החברות שבמעקב שלי</span></label>
      </div>
      <div><a className="btn" href={href} download data-track="export_download">הורדת הקובץ</a></div>
      </>)}

      {state?.status !== "canceled" && (
        confirm ? (
          <div className="notice stack" role="alertdialog" aria-label="ביטול המנוי">
            <p><b>לבטל את המנוי?</b> {preview()}</p>
            <div className="row">
              <button type="button" className="btn primary sm" onClick={cancel} disabled={busy}>ביטול המנוי</button>
              <button type="button" className="btn sm" onClick={() => setConfirm(false)} disabled={busy}>השארת המנוי</button>
            </div>
          </div>
        ) : (
          <div><button type="button" className="btn ghost sm" onClick={() => setConfirm(true)}>ביטול המנוי</button></div>
        )
      )}
      {msg && <p className="small" role="alert">{msg}</p>}
    </div>
  );
}
