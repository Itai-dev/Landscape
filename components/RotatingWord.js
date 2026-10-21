"use client";
import { useEffect, useRef, useState } from "react";

// The hero's craft word, changing like the digits of Apple's clock: the old word's letters roll up and out,
// the new word's letters roll in from below, one after another, inside a clipped line. Every word also sits,
// invisible, in the same grid cell, so the box keeps the longest word's size and nothing around it moves.
// Reduced motion: the first word, still. Screen readers get `label` instead.
export default function RotatingWord({ words, label, interval = 2400 }) {
  const [state, setState] = useState({ i: 0, prev: -1, n: 0 });
  const timer = useRef(null);
  useEffect(() => {
    if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = () => setState((s) => ({ i: (s.i + 1) % words.length, prev: s.i, n: s.n + 1 }));
    const start = () => { clearInterval(timer.current); timer.current = setInterval(tick, interval); };
    const stop = () => clearInterval(timer.current);
    const vis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", vis);
    return () => { stop(); document.removeEventListener("visibilitychange", vis); };
  }, [words.length, interval]);

  const layer = (w, cls, key) => (
    <span className={`rl${cls ? " " + cls : ""}`} key={key}>
      {Array.from(w).map((c, k) => <span key={k} className="rc" style={{ "--k": k }}>{c}</span>)}
    </span>
  );

  return (
    <>
      <span className="rot" aria-hidden="true">
        {words.map((w) => <span key={`s-${w}`} className="rsize">{w}</span>)}
        {state.prev >= 0 && layer(words[state.prev], "out", `o-${state.n}`)}
        {layer(words[state.i], state.n ? "in" : "", `i-${state.n}`)}
      </span>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
