"use client";
import { useEffect, useState } from "react";

// A word that changes every ~2.2s (the hero's craft). All words sit in one grid cell, so the box keeps the size
// of the longest one and nothing around it moves. Reduced motion: the first word, still. Screen readers get `label`.
export default function RotatingWord({ words, label, interval = 2200 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <>
      <span className="rot" aria-hidden="true">
        {words.map((w, n) => <span key={w} className={n === i ? "on" : ""}>{w}</span>)}
      </span>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
