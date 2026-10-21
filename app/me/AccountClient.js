"use client";
import { useState } from "react";
import SignOutButton, { clearLocalData } from "@/components/SignOutButton";

// The account page while profiles are off: where the email is used, and how to leave.
export default function AccountClient() {
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (!window.confirm("למחוק את החשבון, העדפות המייל השבועי ותשובות הסקר? אי אפשר לבטל.")) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) { clearLocalData(); window.location.href = "/?deleted=1"; }
    else { setDeleting(false); window.alert("המחיקה נכשלה. נסו שוב."); }
  }
  return (
    <div className="stack">
      <div className="card stack">
        <h2>המייל השבועי</h2>
        <p className="muted">תחומים, תדירות או הסרה מהרשימה.</p>
        <div className="row"><a className="btn" href="/digest/settings">להגדרות המייל השבועי</a></div>
      </div>
      <div className="card stack">
        <h2>סקר התעריפים</h2>
        <p className="muted">אפשר לחזור לתשובות ולעדכן אותן עד סגירת הסקר.</p>
        <div className="row"><a className="btn" href="/survey">לסקר</a></div>
      </div>
      <div className="card stack">
        <h2>חשבון</h2>
        <div className="row">
          <SignOutButton />
          <button className="btn danger" onClick={remove} disabled={deleting}>מחיקת החשבון וכל המידע</button>
        </div>
      </div>
    </div>
  );
}
