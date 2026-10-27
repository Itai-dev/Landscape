"use client";
import { useState } from "react";
import { shekels } from "@/lib/premium";

const post = (path, body) => fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, status: r.status, ...(await r.json().catch(() => ({}))) }))
  .catch(() => ({ ok: false }));

// Pick a plan, then go to the payment provider's page. Before payments open (no provider yet), the same
// button puts the person on the waitlist instead.
export default function PremiumCheckout({ plans, ready, signedIn = true, children }) {
  const [plan, setPlan] = useState("yearly");
  const [signIn, setSignIn] = useState(false); // signed out: show the sign-in form
  const [phase, setPhase] = useState("idle"); // idle | busy | listed
  const [msg, setMsg] = useState("");
  const [agree, setAgree] = useState(false);

  async function go(e) {
    e.preventDefault();
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
    if (!agree) { setPhase("idle"); return setMsg("כדי להמשיך, סמנו את תיבת האישור."); }
    const res = await post("/api/billing/checkout", { plan, agree: true });
    if (res.ok && res.url) { window.location.assign(res.url); return; }
    setPhase("idle");
    setMsg(res.error === "already_premium" ? "הפרימיום כבר פעיל בחשבון שלכם." : res.error === "rate_limited" ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." : "לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד רגע.");
  }

  if (phase === "listed") {
    return (
      <div className="card stack" role="status">
        <p><b>נרשמתם לרשימת ההמתנה.</b> נשלח לכם מייל כשאפשר יהיה להצטרף.</p>
      </div>
    );
  }
  return (
    <form className="card stack" onSubmit={go}>
      {!ready && <p className="notice small">התשלום נפתח בקרוב. בינתיים אפשר להירשם לרשימת ההמתנה, ונשלח מייל כשזה מוכן.</p>}
      <div className="prplans" role="radiogroup" aria-label="מסלול">
        {plans.map((p) => (
          <label key={p.slug} className={`prplan${plan === p.slug ? " on" : ""}`}>
            <input type="radio" name="plan" value={p.slug} checked={plan === p.slug} onChange={() => setPlan(p.slug)} />
            <span className="pn">{p.label}{p.note && <span className="pt">{p.note}</span>}</span>
            <span className="pp"><b>{shekels(p.price)}</b> {p.per}</span>
          </label>
        ))}
      </div>
      {ready && signedIn && (
        <label className="check small">
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setMsg(""); }} required />
          <span>קראתי את <a href="/terms" target="_blank">תנאי השימוש</a> ואת <a href="/privacy" target="_blank">מדיניות הפרטיות</a>, אני בגיל 18 ומעלה, וידוע לי שהמנוי מתחדש אוטומטית עד שאבטל אותו.</span>
        </label>
      )}
      {signIn ? (
        <div className="stack">{children}</div>
      ) : (
        <button className="btn primary" disabled={phase === "busy"} data-track={ready ? "premium_checkout" : "premium_waitlist"}>
          {!signedIn ? "כניסה והצטרפות" : ready ? "הצטרפות לפרימיום" : "הרשמה לרשימת ההמתנה"}
        </button>
      )}
      {msg && <p className="small" role="alert">{msg}</p>}
    </form>
  );
}
