"use client";
import { useEffect } from "react";

// The ⋯ menus on cards (<details class="menu">): one open at a time, closed by a tap outside or Esc.
export default function MenuCloser() {
  useEffect(() => {
    const open = () => [...document.querySelectorAll("details.menu[open]")];
    const onClick = (e) => open().forEach((d) => !d.contains(e.target) && d.removeAttribute("open"));
    const onToggle = (e) => {
      const d = e.target;
      if (d instanceof HTMLDetailsElement && d.classList.contains("menu") && d.open) open().forEach((x) => x !== d && x.removeAttribute("open"));
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      open().forEach((d) => {
        d.removeAttribute("open");
        if (d.contains(document.activeElement)) d.querySelector("summary")?.focus();
      });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
