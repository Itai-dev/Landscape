// Hebrew spellings of names we only have in English: node scripts/test-search-he.mjs
import { heKey, latinKey, soundsLike } from "../lib/translit.js";

const same = [["עמית", "Amit"], ["קרסני", "Krasny"], ["שורטקאט", "Shortcut"], ["פלייטיקה", "Playtika"], ["ויקס", "Wix"],
  ["מקאן", "McCann"], ["ירון", "Yaron"], ["משיח", "Mashiach"], ["שמואלי", "Shmueli"], ["פיינברג", "Feinberg"],
  ["חצרוני", "Hatzroni"], ["ג'ייקוב", "Jacob"], ["קסטרו", "Castro"], ["אוסנת", "Osnat"], ["עזרא", "Ezra"]];
let fail = 0;
for (const [he, en] of same) if (heKey(he) !== latinKey(en)) { fail++; console.log(`✗ ${he} (${heKey(he)}) ≠ ${en} (${latinKey(en)})`); }
const cases = [
  ["עמית", "Amit Krasny", true],
  ["עמית", "Matan Hatzroni", false], // short keys must match a whole word
  ["שורטק", "SCPG Shortcut Playground", true], // longer keys may be the start of a word
  ["zzz", "Amit", false],
  ["Amit", "Amit", false], // Latin queries use plain matching, not this
];
for (const [q, hay, want] of cases) if (soundsLike(q, hay) !== want) { fail++; console.log(`✗ soundsLike(${q}, ${hay}) should be ${want}`); }
const n = same.length + cases.length;
if (fail) { console.log(`${fail} of ${n} checks failed`); process.exit(1); }
console.log(`${n} checks passed`);
