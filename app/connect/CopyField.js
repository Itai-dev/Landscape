"use client";
import { useState } from "react";

// The connector's address, selected on focus, with a copy button.
export default function CopyField({ value, label }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {}
  }
  return (
    <div className="cn-copy">
      <input className="ltr" dir="ltr" readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn primary" onClick={copy} data-track="connect_copy">{done ? "הכתובת הועתקה" : "העתקת הכתובת"}</button>
    </div>
  );
}
