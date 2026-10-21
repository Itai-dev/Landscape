"use client";
import { useEffect, useState } from "react";
import Bidi from "@/components/Bidi";

// Desktop hero card: this week's updates, one at a time, with the company as a chip in the corner (like a shot and
// its author). Each card links to the company. Reduced motion: the first one, still. Hidden on phones (sell.css).
export default function HeroMedia({ items, interval = 4200 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);
  if (!items.length) return null;
  return (
    <div className="hmedia" aria-label="עדכונים מהשבוע">
      {items.map((x, n) => {
        const Tag = x.href ? "a" : "div";
        return (
          <Tag key={x.id} className={`hcard${n === i ? " on" : ""}`} aria-hidden={n === i ? undefined : "true"} tabIndex={n === i ? undefined : -1}
            {...(x.href ? { href: x.href, "data-track": "company_open", "data-track-where": "home_hero" } : {})}>
            <span className="hlabel">{x.label} · {x.day}</span>
            <span className="hhead"><Bidi>{x.headline}</Bidi></span>
            {x.org && (
              <span className="hchip">
                {x.logo ? <img src={x.logo} alt="" width="24" height="24" /> : <span className="hmono" aria-hidden="true">{String(x.org).trim().charAt(0)}</span>}
                <bdi>{x.org}</bdi>
              </span>
            )}
          </Tag>
        );
      })}
      {items.length > 1 && (
        <span className="hdots" aria-hidden="true">{items.map((x, n) => <i key={x.id} className={n === i ? "on" : ""} />)}</span>
      )}
    </div>
  );
}
