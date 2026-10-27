"use client";
import { useState } from "react";
import SignOutButton, { clearLocalData } from "@/components/SignOutButton";

// The account page while profiles are off: where the email is used, and how to leave.
export default function AccountClient() {
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (!window.confirm("למחוק את החשבון, העדפות הניוזלטר ותשובות הסקר? אי אפשר לבטל.")) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) { clearLocalData(); window.location.href = "/?deleted=1"; }
    else {
      setDeleting(false);
      const j = await res.json().catch(() => ({}));
      window.alert(j.error === "cancel_plan_first"
        ? "לא הצלחנו לבטל את מנוי הפרימיום אצל חברת הסליקה, אז החשבון לא נמחק. בטלו קודם את המנוי למעלה, או כתבו לנו."
        : "לא הצלחנו למחוק את החשבון. נסו שוב.");
    }
  }
  return (
    <div className="stack">
      <div className="card stack mesettings">
        <h2>הגדרות החשבון</h2>
        <div className="mrow">
          <div><b>סיסמה</b><p className="muted small">כניסה עם המייל והסיסמה מכל מכשיר, בלי לחכות לקישור.</p></div>
          <a className="btn sm" href="/me/password">הגדרת סיסמה</a>
        </div>
        <div className="row">
          <SignOutButton />
          <button className="btn danger" onClick={remove} disabled={deleting}>מחיקת החשבון וכל המידע</button>
        </div>
      </div>
    </div>
  );
}
