"use client";
import { useEffect, useState } from "react";
import { UNLOCK_REFERRALS } from "@/lib/survey/config";

// Personal invite link + a ready LinkedIn post. Shown after answering and on the results page.
export default function ShareInvite({ showCounter = false }) {
  const [s, setS] = useState(null);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    fetch("/api/survey", { cache: "no-store" }).then((r) => r.json()).then(setS).catch(() => setS({}));
  }, []);
  if (!s?.code) return null;

  const link = `${window.location.origin}/survey?ref=${s.code}`;
  const post = [
    "עניתי על סקר התעריפים ותנאי התשלום 2026 של תעשיית הקריאייטיב בישראל: מושן, אנימציה, VFX, פוסט, סאונד ועיצוב.",
    "4 דקות, התשובות חסויות, ומי שעונה רואה את התוצאות: כמה גובים בכל תחום, מה תנאי התשלום המקובלים, ואיפה מאחרים בתשלום.",
    "ככל שיותר אנשים עונים, כך כולנו נדע לתמחר נכון יותר:",
    link,
  ].join("\n\n");

  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 2500); } catch { setCopied("fail"); }
  }

  return (
    <div className="card stack invite">
      <h2>הזמינו עוד אנשים מהתחום</h2>
      <p className="muted">
        כל תשובה פותחת עוד שורה בתוצאות: קבוצה מוצגת רק מ־5 משיבים.
        {showCounter && ` הזמנה של ${UNLOCK_REFERRALS} אנשים שעונים פותחת את התוצאות המלאות גם בלי לענות.`}
      </p>
      {showCounter && (
        <p className="counter">
          <b className="mono">{Math.min(s.referred || 0, UNLOCK_REFERRALS)}</b> מתוך <b className="mono">{UNLOCK_REFERRALS}</b> מוזמנים כבר ענו <span className="small muted">(מתעדכן פעם ביום, עם התוצאות)</span>
        </p>
      )}
      <div className="linkrow">
        <input type="text" readOnly value={link} dir="ltr" aria-label="קישור ההזמנה האישי" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn" onClick={() => copy(link, "link")}>{copied === "link" ? "הועתק" : "העתקת הקישור"}</button>
      </div>
      <details>
        <summary>פוסט מוכן ללינקדאין</summary>
        <pre className="post">{post}</pre>
      </details>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => copy(post, "post")}>{copied === "post" ? "הפוסט הועתק" : "העתקה כפוסט ללינקדאין"}</button>
        <a className="btn soft" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">פתיחת לינקדאין</a>
      </div>
      {copied === "fail" && <p className="small muted" role="status">ההעתקה לא הצליחה. סמנו את הטקסט והעתיקו ידנית.</p>}
      <p className="small muted" role="status" aria-live="polite">{copied === "post" ? "הדביקו בפוסט חדש בלינקדאין." : ""}</p>
    </div>
  );
}
