// Hebrew spellings of Latin names: "עמית" finds "Amit", "שורטקאט" finds "Shortcut".
// Both sides become a rough consonant key (vowels and silent letters drop out, sound-alike letters merge),
// so a Hebrew search word can match a name we only have in English. Used for matching only, never shown.
// site/app.html mirrors this file (keep them in sync).

const HE = {
  א: "", ב: "b", ג: "g", ד: "d", ה: "h", ו: "", ז: "z", ח: "h", ט: "t", י: "", כ: "k", ך: "k", ל: "l",
  מ: "m", ם: "m", נ: "n", ן: "n", ס: "s", ע: "", פ: "p", ף: "p", צ: "s", ץ: "s", ק: "k", ר: "r", ש: "s", ת: "t",
};

const HAS_HE = /[א-ת]/;
export const hasHebrew = (s) => HAS_HE.test(s);

function finish(k) {
  return k.replace(/h$/, "").replace(/(.)\1+/g, "$1");
}

// One Hebrew word → key. ו and י are vowels inside a word but consonants at its start (ורד, ירון).
export function heKey(word) {
  const w = String(word || "").replace(/[^א-ת]/g, "");
  let k = "";
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (i === 0 && c === "ו") k += "b";
    else if (i === 0 && c === "י") k += "y";
    else k += HE[c] ?? "";
  }
  return finish(k);
}

// One Latin word → key, on the same scale.
export function latinKey(word) {
  let w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  const startY = w[0] === "y";
  w = w
    .replace(/sch|sh/g, "s")
    .replace(/ch|kh/g, "h")
    .replace(/ph/g, "p")
    .replace(/t[sz]/g, "s")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/[cq]/g, "k")
    .replace(/x/g, "ks")
    .replace(/[vw]/g, "b")
    .replace(/f/g, "p")
    .replace(/j/g, "g");
  const k = w.replace(/[aeiouy]/g, "");
  return finish((startY ? "y" : "") + k);
}

const cache = new Map();
function latinKeys(hay) {
  let keys = cache.get(hay);
  if (!keys) {
    keys = String(hay).split(/[^a-zA-Z]+/).filter((x) => x.length > 1).map(latinKey).filter(Boolean);
    if (cache.size > 5000) cache.clear();
    cache.set(hay, keys);
  }
  return keys;
}

// Does a Hebrew search word sound like a Latin word in the text? Short keys must match exactly
// ("עמית" = Amit, not Matan); longer ones may be the start of a word ("שורטק" → Shortcut).
export function soundsLike(term, hay) {
  if (!hasHebrew(term)) return false;
  const k = heKey(term);
  if (k.length < 2) return false;
  return latinKeys(hay).some((h) => h === k || (k.length >= 4 && h.startsWith(k)));
}
