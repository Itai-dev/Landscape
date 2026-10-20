"use client";
import { useState } from "react";
import ProfileForm from "@/components/ProfileForm";

export default function MeClient({ initial }) {
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm("למחוק את החשבון, הפרופיל והעדפות הניוזלטר? אי אפשר לבטל.")) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) window.location.href = "/?deleted=1";
    else {
      setDeleting(false);
      window.alert("המחיקה נכשלה. נסו שוב.");
    }
  }

  return (
    <div className="stack">
      {saved && <div className="notice ok" role="status">נשמר.</div>}
      <ProfileForm initial={initial} submitLabel="שמירת שינויים" onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      <div className="card">
        <h2>חשבון</h2>
        <div className="row">
          <form action="/auth/signout" method="post"><button className="btn">יציאה</button></form>
          <button className="btn danger" onClick={remove} disabled={deleting}>מחיקת החשבון וכל המידע</button>
        </div>
      </div>
    </div>
  );
}
