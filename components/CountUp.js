"use client";
import { useEffect, useRef, useState } from "react";

// A number that counts up from 0 the first time it comes into view (about 1.2s, easing out).
// The server renders the final number, so it reads right without JavaScript; reduced motion keeps it still.
export default function CountUp({ to, duration = 1200, className }) {
  const ref = useRef(null);
  const [n, setN] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || !to || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    setN(0);
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} className={className} aria-label={to.toLocaleString("he-IL")}><span aria-hidden="true">{n.toLocaleString("he-IL")}</span></span>;
}
