"use client";
import { useState } from "react";

// Copies a ready LinkedIn post (text built on the server) to the clipboard.
export default function CopyPost({ text }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }
  return (
    <button type="button" className="btn" onClick={copy} aria-live="polite">
      {done ? "הועתק. הדביקו בלינקדאין" : "העתקה כפוסט ללינקדאין"}
    </button>
  );
}
