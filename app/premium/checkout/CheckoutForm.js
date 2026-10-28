"use client";
import { useState } from "react";
import { shekels, checkCustomer, COUNTRIES } from "@/lib/premium";

const post = (path, body) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, status: r.status, ...(await r.json().catch(() => ({}))) }))
  .catch(() => ({ ok: false }));

const WHY = {
  name: "מלאו שם פרטי ושם משפחה.",
  phone: "מספר הטלפון לא נראה תקין. כתבו אותו בלי קידומת מדינה, למשל 0501234567.",
  country: "בחרו מדינה.",
};

// The payment page: the plan, the buyer's details, the consent box with a link to the terms, then the payment
// provider's card page. Before payments open (no provider yet), the same form puts the person on the waitlist
// instead, and the details aren't sent anywhere.
export default function CheckoutForm({ plans, initialPlan = "yearly", ready, signedIn, email = "", children }) {
  const [plan, setPlan] = useState(initialPlan);
  const [f, setF] = useState({ firstName: "", lastName: "", phone: "", country: "ישראל", email });
  const [agree, setAgree] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | busy | listed
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(""); };
  const chosen = plans.find((p) => p.slug === plan) || plans[0];

  async function go(e) {
    e.preventDefault();
    const c = checkCustomer(f);
    if (!c.ok) return setMsg(WHY[c.errors[0]]);
    if (!agree) return setMsg("כדי להמשיך, סמנו את תיבת האישור.");
    if (!signedIn) return setSignIn(true);
    setPhase("busy");
    setMsg("");
    try { window.va?.("event", { name: ready ? "premium_checkout" : "premium_waitlist", data: { plan } }); } catch {}
    if (!ready) {
      const res = await post("/api/premium/waitlist", { plan });
      if (res.ok) return setPhase("listed");
      setPhase("idle");
      return setMsg("לא הצלחנו לשמור. נסו שוב.");
    }
    const res = await post("/api/billing/checkout", { plan, agree: true, customer: c.customer });
    if (res.ok && res.url) { window.location.assign(res.url); return; }
    setPhase("idle");
    setMsg(res.error === "already_premium" ? "הפרימיום כבר פעיל בחשבון שלכם." : res.error === "rate_limited" ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." : res.error === "bad_customer" ? "בדקו את הפרטים ונסו שוב." : "לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד רגע.");
  }

  if (phase === "listed") {
    return (
      <div className="card stack" role="status">
        <p><b>נרשמתם לרשימת ההמתנה.</b> נשלח לכם מייל כשאפשר יהיה להצטרף.</p>
      </div>
    );
  }
  return (
    <form className="card stack" onSubmit={go} noValidate>
      {!ready && <p className="notice small">התשלום נפתח בקרוב. בינתיים אפשר להירשם לרשימת ההמתנה, ונשלח מייל כשזה מוכן.</p>}

      <fieldset className="stack">
        <legend className="h3">מסלול</legend>
        <div className="prplans" role="radiogroup" aria-label="מסלול">
          {plans.map((p) => (
            <label key={p.slug} className={`prplan${plan === p.slug ? " on" : ""}`}>
              <input type="radio" name="plan" value={p.slug} checked={plan === p.slug} onChange={() => setPlan(p.slug)} />
              <span className="pn">{p.label}{p.note && <span className="pt">{p.note}</span>}</span>
              <span className="pp"><b>{shekels(p.price)}</b> {p.per}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="stack">
        <legend className="h3">פרטי המשלם</legend>
        <div className="prfields">
          <div className="field"><label htmlFor="co-first">שם פרטי</label><input id="co-first" type="text" autoComplete="given-name" value={f.firstName} onChange={set("firstName")} required /></div>
          <div className="field"><label htmlFor="co-last">שם משפחה</label><input id="co-last" type="text" autoComplete="family-name" value={f.lastName} onChange={set("lastName")} required /></div>
          <div className="field"><label htmlFor="co-phone">טלפון</label><input id="co-phone" type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" placeholder="0501234567" value={f.phone} onChange={set("phone")} required /><p className="field-hint small muted">בלי קידומת מדינה.</p></div>
          <div className="field"><label htmlFor="co-country">מדינה</label><select id="co-country" autoComplete="country-name" value={f.country} onChange={set("country")}>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="field prwide"><label htmlFor="co-email">כתובת מייל</label><input id="co-email" type="email" autoComplete="email" dir="ltr" value={f.email} onChange={set("email")} readOnly={signedIn && Boolean(email)} required />{signedIn && email && <p className="field-hint small muted">המייל של החשבון. אליו יישלחו אישור המנוי והקבלות.</p>}</div>
        </div>
      </fieldset>

      <div className="prsum small">
        <span>לתשלום: <b>{shekels(chosen.price)}</b> {chosen.per}.</span> <span>המנוי מתחדש אוטומטית עד שמבטלים. אפשר לבטל בכל רגע באזור האישי.</span>
      </div>

      <label className="check small">
        <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setMsg(""); }} required />
        <span>קראתי ואישרתי את <a href="/terms" target="_blank">התקנון ותנאי השימוש</a> ואת <a href="/privacy" target="_blank">מדיניות הפרטיות</a>, אני בגיל 18 ומעלה, וידוע לי שהמנוי מתחדש אוטומטית עד שאבטל אותו.</span>
      </label>

      {signIn ? (
        <div className="stack">{children}</div>
      ) : (
        <button className="btn primary" disabled={phase === "busy"} data-track={ready ? "premium_checkout" : "premium_waitlist"}>
          {!signedIn ? "כניסה והמשך לתשלום" : ready ? "המשך לתשלום" : "הרשמה לרשימת ההמתנה"}
        </button>
      )}
      {ready && <p className="small muted">התשלום מתבצע בעמוד מאובטח של חברת הסליקה. פרטי הכרטיס לא נשמרים אצלנו.</p>}
      {msg && <p className="small" role="alert">{msg}</p>}
    </form>
  );
}
