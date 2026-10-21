// Plain-sentence searches on /search: node scripts/test-search-sentences.mjs (after a build: needs lib/generated).
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
const { parseQuery } = await import("../lib/match.js");
const { searchCompanies } = await import("../lib/companies.js");

let fail = 0, n = 0;
const check = (ok, msg) => { n++; if (!ok) { fail++; console.log("✗ " + msg); } };

const p1 = parseQuery("משרד הפרסום הכי גדול בישראל");
check(p1.kind === "agency" && p1.q === "", `agency question → ${JSON.stringify(p1)}`);
check(searchCompanies(p1.q, p1.craft, p1.kind).length > 10, "agency question finds the agencies");
const p2 = parseQuery("מי מזמין מושן בתל אביב?");
check(p2.craft === "motion-design" && p2.kind === "" && p2.q.includes("תל"), `craft + city → ${JSON.stringify(p2)}`);
const p3 = parseQuery("סטודיואים לאנימציה בתל אביב");
check(p3.kind === "studio", `studios → ${JSON.stringify(p3)}`);
const p4 = parseQuery("מושן");
check(p4.craft === "motion-design" && p4.kind === "", "single craft word stays a craft");
const p5 = parseQuery("סטודיו");
check(p5.kind === "studio" && p5.q === "", "single type word becomes the type");
const loose = searchCompanies("פלייטיקה xyzzyq", "", "");
check(loose.loose === true && loose.length > 0, "a phrase with one unknown word falls back to close matches");
const strict = searchCompanies("playtika", "", "");
check(!strict.loose && strict.length > 0, "a plain name stays an exact search");

if (fail) { console.log(`${fail} of ${n} checks failed`); process.exit(1); }
console.log(`${n} checks passed`);
