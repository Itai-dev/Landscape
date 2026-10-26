"use client";
import { useEffect, useRef, useState } from "react";
import Bidi from "@/components/Bidi";
import KindTag from "@/components/KindTag";

// Desktop hero card: this week's updates, one at a time, in the same anatomy as the update cards below
// (type and date, headline, why it matters, then the company and the source), only larger. It moves on by itself
// and pauses while the pointer or focus is on it; arrows, the dots and a swipe move it by hand. Reduced motion:
// no autoplay. Hidden on phones (sell.css), where the week's updates follow the hero anyway.
const Arrow = ({ flip }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}><path d="m9 18 6-6-6-6" /></svg>
);
const WHY = "למה זה רלוונטי";

export default function HeroMedia({ items, interval = 6000 }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = items.length;
  const go = (k) => setI(((k % n) + n) % n);

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), interval);
    return () => clearInterval(t);
  }, [n, interval, paused]);
  if (!n) return null;

  // RTL: "next" is to the left. A swipe toward the start (right) goes back, toward the end (left) goes forward.
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
  };

  return (
    <div className="hmedia" role="region" aria-roledescription="קרוסלה" aria-label="עדכונים מהשבוע"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {items.map((x, k) => {
        const on = k === i;
        const tab = on ? undefined : -1;
        return (
          <article key={x.id} className={`hcard${on ? " on" : ""}`} aria-hidden={on ? undefined : "true"}
            aria-roledescription="שקופית" aria-label={`${k + 1} מתוך ${n}`}>
            <p className="umeta"><b>{x.label}</b> · {x.day}</p>
            <div className="hbody">
              <p className="hhead"><Bidi>{x.headline}</Bidi></p>
              {x.why && <p className="hwhy">{WHY}: <Bidi>{x.why}</Bidi></p>}
            </div>
            <div className="hfoot">
              {x.org && (() => {
                const Org = x.href ? "a" : "span";
                return (
                  <Org className="hco" tabIndex={x.href ? tab : undefined}
                    {...(x.href ? { href: x.href, "data-track": "company_open", "data-track-where": "home_hero" } : {})}>
                    <span className="hlogo">
                      {x.logo ? <img src={x.logo} alt="" width="48" height="48" style={x.logo_px ? { maxWidth: Math.min(x.logo_px, 40), maxHeight: Math.min(x.logo_px, 40) } : undefined} /> : <span aria-hidden="true">{String(x.org).trim().charAt(0)}</span>}
                    </span>
                    <span className="hname"><bdi>{x.org}</bdi>{x.kind && <KindTag kind={x.kind} />}</span>
                  </Org>
                );
              })()}
              {x.source_url && (
                <a className="btn sm hsrc" href={x.source_url} target="_blank" rel="noopener noreferrer" tabIndex={tab}
                  data-track="opportunity_source_click" data-track-category={x.type} data-track-where="home_hero">
                  <span>לפרסום{x.source ? <> ב־<bdi>{x.source}</bdi></> : ""}</span><span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </article>
        );
      })}
      {n > 1 && (
        <div className="hctrl">
          <button type="button" className="harrow" onClick={() => go(i - 1)} aria-label="העדכון הקודם"><Arrow /></button>
          <span className="hdots">
            {items.map((x, k) => (
              <button key={x.id} type="button" className={k === i ? "on" : ""} onClick={() => go(k)} aria-label={`עדכון ${k + 1}`} aria-current={k === i ? "true" : undefined} />
            ))}
          </span>
          <button type="button" className="harrow" onClick={() => go(i + 1)} aria-label="העדכון הבא"><Arrow flip /></button>
        </div>
      )}
    </div>
  );
}
