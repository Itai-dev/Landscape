"use client";
import { useEffect } from "react";
import { track } from "@vercel/analytics";
import taxonomy from "@/schema/taxonomy.json";
import { fold, parseQuery } from "@/lib/match";

// Meaningful actions for Vercel Web Analytics (custom events need a plan that has them; otherwise track()
// is a no-op). Visitors and return visits come from Vercel Analytics itself: no cookies, no ids of ours.
//  - Any element with data-track="event" reports a click; data-track-label / -category / -where ride along.
//  - Links to a company page (/companies/<id>) report company_open.
//  - Search forms report search_submit with two flags only (a craft, a city). The query text is never sent.
//  - A tender's official link reports tender_source_click and opportunity_source_click {category: tender}.
const CITY_WORDS = new Set(Object.entries(taxonomy.cities_he || {}).flatMap(([en, he]) => [fold(en).split(" ")[0], fold(he).split(" ")[0]]));
const unprefix = (w) => (w.length > 2 && /^[בלמ]/.test(w) ? w.slice(1) : w);
const ALIAS = { tender_source_open: "tender_source_click" };

function send(name, props) {
  try { track(name, props && Object.keys(props).length ? props : undefined); } catch {}
}

function propsOf(el) {
  const d = el.dataset || {};
  const p = {};
  if (d.trackLabel) p.label = d.trackLabel;
  if (d.trackCategory) p.category = d.trackCategory;
  if (d.trackWhere) p.where = d.trackWhere;
  return p;
}

export default function TrackClicks() {
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.("[data-track], a[href]");
      if (!el) return;
      const name = el.getAttribute("data-track");
      if (name) {
        const event = ALIAS[name] || name;
        send(event, propsOf(el));
        if (event === "tender_source_click") send("opportunity_source_click", { category: "tender" });
        return;
      }
      const href = el.getAttribute("href") || "";
      if (/^\/companies\/[^/#?]+$/.test(href) && !/^\/companies\/(data|index\.html)/.test(href)) send("company_open", { where: location.pathname });
    };
    const onSubmit = (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || form.getAttribute("role") !== "search") return;
      const data = new FormData(form);
      const q = String(data.get("q") || "");
      const parsed = parseQuery(q);
      const hasCraft = Boolean(data.get("craft") || parsed.craft);
      const hasCity = Boolean(data.get("city")) || fold(q).split(" ").some((w) => CITY_WORDS.has(w) || CITY_WORDS.has(unprefix(w)));
      send("search_submit", { where: (form.getAttribute("action") || location.pathname).slice(0, 40), has_craft: hasCraft, has_city: hasCity });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);
  return null;
}
