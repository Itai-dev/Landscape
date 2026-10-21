// "במעקב שלכם" in the newsletter: updates on companies in the reader's tracking list lead the edition.
// node scripts/test-digest-tracked.mjs (after a build)
import { register } from "node:module";
import assert from "node:assert/strict";
register("./alias-hooks.mjs", import.meta.url);
const { composeDigest } = await import("../lib/digest.js");
const { renderDigestEmail } = await import("../lib/digestEmail.js");
const { default: signalsFile } = await import("../site/data/signals.json", { with: { type: "json" } });

// The newest update about a company in the directory, and an edition the day after it.
const sig = signalsFile.signals.filter((s) => s.org_id && !s.hidden).sort((a, b) => b.date.localeCompare(a.date))[0];
const now = new Date(`${sig.date}T12:00:00Z`); now.setUTCDate(now.getUTCDate() + 1);
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const plain = composeDigest({ now, days: 7 });
ok(plain.tracked.length === 0, "no tracking list, no section");

const d = composeDigest({ now, days: 7, follows: [sig.org_id] });
ok(d.tracked.some((i) => i.id === sig.id), "the followed company's update is in the section");
ok(![...d.items, ...d.more].some((i) => i.id === sig.id), "and not repeated further down");
ok(!d.empty, "a tracked update alone is worth an edition");

const mail = renderDigestEmail(d, { base: "https://x.test" });
ok(mail.html.includes("במעקב שלכם") && mail.text.includes("במעקב שלכם"), "the email has the section (html and text)");

const other = composeDigest({ now, days: 7, follows: ["not-a-company"] });
ok(other.tracked.length === 0, "unknown ids add nothing");

console.log(`${n} checks passed`);
