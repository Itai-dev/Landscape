// A typing placeholder for search fields: types an example, holds it, deletes it, types the next.
// It's an aria-hidden overlay over the input (the input keeps its aria-label and an empty placeholder while it runs).
// Stops on focus or when the field has text, resumes on blur when empty, pauses while the tab is hidden.
// Reduced motion: a plain placeholder with the first example. Used by the hero search and the site header search.

// Every example returns results on /search (checked against the built app before they were added).
export const TYPING_EXAMPLES = ["מי מזמין מושן בתל אביב?", "מנכ״ל שורטקאט", "הפקת אירועים", "סמנכ״ל שיווק", "אנימציה בתל אביב", "פלייטיקה"];

const TYPE_MS = 55, DELETE_MS = 30, HOLD_MS = 1600, GAP_MS = 350;

/** Start the animation on `input`. Returns a function that stops it and removes the overlay. */
export function installTyping(input, examples = TYPING_EXAMPLES) {
  if (!input || typeof window === "undefined" || !examples.length) return () => {};
  if (input.offsetParent === null) return () => {}; // hidden (e.g. the header field on the home page)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    input.placeholder = examples[0];
    return () => {};
  }
  const host = input.parentElement;
  const overlay = document.createElement("span");
  overlay.className = "typeph";
  overlay.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  overlay.appendChild(text);
  host.appendChild(overlay);
  const saved = input.placeholder;
  input.placeholder = "";

  const place = () => {
    const cs = getComputedStyle(input);
    Object.assign(overlay.style, {
      top: `${input.offsetTop}px`, left: `${input.offsetLeft}px`, width: `${input.offsetWidth}px`, height: `${input.offsetHeight}px`,
      paddingInlineStart: cs.paddingInlineStart, paddingInlineEnd: cs.paddingInlineEnd,
      font: cs.font, letterSpacing: cs.letterSpacing,
    });
  };
  place();

  let ex = 0, pos = 0, mode = "type", timer = 0, running = false;
  const tick = () => {
    const word = examples[ex];
    if (mode === "type") {
      pos++;
      text.textContent = word.slice(0, pos);
      if (pos >= word.length) { mode = "hold"; timer = setTimeout(tick, HOLD_MS); return; }
      timer = setTimeout(tick, TYPE_MS);
    } else if (mode === "hold") {
      mode = "delete"; timer = setTimeout(tick, DELETE_MS);
    } else {
      pos--;
      text.textContent = word.slice(0, Math.max(0, pos));
      if (pos <= 0) { mode = "type"; ex = (ex + 1) % examples.length; timer = setTimeout(tick, GAP_MS); return; }
      timer = setTimeout(tick, DELETE_MS);
    }
  };
  const start = () => {
    if (running || input.value || document.activeElement === input || document.hidden) return;
    running = true; overlay.hidden = false; place(); timer = setTimeout(tick, GAP_MS);
  };
  const stop = () => { running = false; clearTimeout(timer); overlay.hidden = true; };
  const onBlur = () => { if (!input.value) start(); };
  const onInput = () => { if (input.value) stop(); };
  const onVis = () => (document.hidden ? (clearTimeout(timer), (running = false)) : start());
  const onResize = () => place();
  input.addEventListener("focus", stop);
  input.addEventListener("blur", onBlur);
  input.addEventListener("input", onInput);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", onResize);
  start();
  return () => {
    stop();
    input.removeEventListener("focus", stop);
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("input", onInput);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", onResize);
    overlay.remove();
    input.placeholder = saved;
  };
}
