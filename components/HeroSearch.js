"use client";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/Icons";
import { installTyping, TYPING_EXAMPLES } from "@/lib/typing.mjs";

// The home search block, Dribbble-style: tabs choose where the query goes, one wide field, popular crafts under it.
// Every target reads ?q=. "הכל" is /search (it also reads questions like "מושן בתל אביב" as a craft plus a city).
// The field types example queries (lib/typing.mjs); its static placeholder is the first one.
const TABS = [
  { key: "all", label: "הכל", action: "/search" },
  { key: "companies", label: "חברות", action: "/companies" },
  { key: "people", label: "אנשים", action: "/people" },
  { key: "tenders", label: "מכרזים", action: "/tenders" },
];

export default function HeroSearch({ popular }) {
  const [tab, setTab] = useState(TABS[0]);
  const input = useRef(null);
  useEffect(() => installTyping(input.current), []);
  return (
    <div className="hsearchblock">
      <div className="htabs" role="tablist" aria-label="איפה לחפש">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab.key} className={t.key === tab.key ? "on" : ""} onClick={() => setTab(t)}>{t.label}</button>
        ))}
      </div>
      <form className="psearch lg hfield" role="search" action={tab.action}>
        <input ref={input} type="search" name="q" placeholder={TYPING_EXAMPLES[0]} aria-label={`חיפוש: ${tab.label}`} autoComplete="off" />
        <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
      </form>
      <div className="popular hpop">
        <b>פופולרי:</b>
        {popular.map((p) => <a key={p.slug} className="tag" href={`/search?craft=${p.slug}`}>{p.label}</a>)}
      </div>
    </div>
  );
}
