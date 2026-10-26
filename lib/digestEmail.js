// The digest as an email: RTL, table layout with inline styles (email clients, Outlook via an MSO wrapper),
// a plain-text part, and the sender's identity and unsubscribe link in every footer. Server only.
import { craftsTitle } from "@/lib/digest";
import { bidiHtml, clip } from "@/lib/bidi";
import { sender, wordmarkImg } from "@/lib/mailer";

const C = { ink: "#110034", muted: "#5b5675", accent: "#8217ff", soft: "#f4f1fb", line: "#e6e2ef", bg: "#f7f6fa", white: "#ffffff" };
const FONT = "'Google Sans', Arial, 'Helvetica Neue', sans-serif";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bdi = (s) => `<bdi>${esc(s)}</bdi>`;
const WHY_MAX = 110; // about one line on a phone, two on desktop

const plural = (n, one, many) => (n === 1 ? one : `${n} ${many}`);

export function digestSubject(d) {
  const n = d.items.length;
  const title = d.period.title;
  const nt = d.tenders?.length || 0;
  const tenderPart = nt ? (nt === 1 ? "מכרז פתוח" : `${nt} מכרזים פתוחים`) : "";
  // Name the crafts only when the updates really are about them.
  const and = nt === 1 ? " ומכרז פתוח" : nt ? ` ו־${tenderPart}` : "";
  if (d.crafts.length && n) return `${title}: ${plural(n, "עדכון אחד", "עדכונים")}${and} ל${craftsTitle(d)}`;
  if (d.crafts.length && nt) return `${title}: ${tenderPart} ל${craftsTitle(d)}`;
  if (d.crafts.length && d.picks.length) return `${title}: מי מזמין ${craftsTitle(d)}`;
  if (!d.items.length && !d.more.length && nt) return `${title}: ${tenderPart}`;
  const all = [...d.items, ...d.more];
  const lead = all[0]?.org?.name;
  return lead && all.length > 1 ? `${title}: ${lead} ועוד ${plural(all.length - 1, "עדכון אחד", "עדכונים")}` : title;
}

function section(title) {
  return `<tr><td style="padding:28px 24px 8px;font:700 18px/1.4 ${FONT};color:${C.ink};" class="ink pad">${esc(title)}</td></tr>`;
}

function itemRow(i, d) {
  const org = i.org?.href
    ? `<a href="${esc(i.org.href)}" style="color:${C.accent};text-decoration:none;font-weight:600;" class="acc">${bdi(i.org.name)}</a>`
    : i.org?.name ? bdi(i.org.name) : "";
  const src = i.source_url ? `${org ? " · " : ""}<a href="${esc(i.source_url)}" style="color:${C.muted};" class="muted">${bdi(i.source || "מקור")}</a>` : "";
  const when = i.late ? `${esc(i.day)} · הגיע אלינו ${esc(d.period.span)}` : esc(i.day);
  return `<tr><td style="padding:8px 24px;" class="pad">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:14px;" class="card">
    <tr><td style="padding:16px 18px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
      <div style="font:600 13px/1.4 ${FONT};color:${C.accent};margin-bottom:6px;" class="acc">${esc(i.label)} · ${when}</div>
      <div style="font-weight:600;margin-bottom:6px;">${bidiHtml(i.headline)}</div>
      ${i.why ? `<div style="color:${C.muted};margin-bottom:8px;" class="muted">${bidiHtml(clip(i.why, WHY_MAX))}</div>` : ""}
      <div style="font-size:14px;color:${C.muted};" class="muted">${org}${src}</div>
    </td></tr>
  </table>
</td></tr>`;
}

function tenderRow(t) {
  const buyer = t.buyer_href
    ? `<a href="${esc(t.buyer_href)}" style="color:${C.ink};font-weight:600;text-decoration:none;" class="ink">${bdi(t.buyer)}</a>`
    : `<span style="font-weight:600;">${bdi(t.buyer)}</span>`;
  return `<tr><td style="padding:8px 24px;" class="pad">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:14px;" class="card">
    <tr><td style="padding:16px 18px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
      <div style="font:600 13px/1.4 ${FONT};color:${C.accent};margin-bottom:6px;" class="acc">${esc(t.label)} · ${t.state === "upcoming" ? esc(t.when || t.countdown) : `${esc(t.countdown)} · הגשה עד <bdi>${esc(t.deadline)}</bdi>`}</div>
      <div style="font-weight:600;margin-bottom:4px;">${bidiHtml(t.summary)}</div>
      <div style="font-size:14px;color:${C.muted};margin-bottom:8px;" class="muted">${buyer}</div>
      <a href="${esc(t.url)}" style="color:${C.accent};font-weight:600;text-decoration:none;font-size:14px;" class="acc">למכרז במקור הרשמי ‹</a>
    </td></tr>
  </table>
</td></tr>`;
}

// "כלים ו־AI השבוע": a tool update from the maker's own changelog or blog, with the official source.
function toolRow(u) {
  return `<tr><td style="padding:8px 24px;" class="pad">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:14px;" class="card">
    <tr><td style="padding:16px 18px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
      <div style="font:600 13px/1.4 ${FONT};color:${C.accent};margin-bottom:6px;" class="acc">עדכון · ${bdi(u.tool)} · ${esc(u.day)}</div>
      <div style="font-weight:600;margin-bottom:6px;">${bidiHtml(u.headline)}</div>
      <div style="color:${C.muted};margin-bottom:8px;" class="muted">${bidiHtml(clip(u.why, WHY_MAX))}</div>
      <a href="${esc(u.source_url)}" style="color:${C.muted};font-size:14px;" class="muted">מקור רשמי</a>
    </td></tr>
  </table>
</td></tr>`;
}

function pickRow(p) {
  return `<tr><td style="padding:6px 24px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink pad">
  <a href="${esc(p.org.href)}" style="color:${C.ink};font-weight:700;text-decoration:none;" class="ink">${bdi(p.org.name)}</a>${p.craft ? ` <span style="color:${C.muted};font-size:13px;" class="muted">· ${esc(p.craft)}</span>` : ""}
  <div style="color:${C.muted};font-size:14px;" class="muted">${bidiHtml(clip(p.reason, WHY_MAX))}</div>
  ${p.detail ? `<div style="color:${C.muted};font-size:13px;" class="muted">${bidiHtml(clip(p.detail, 90))}</div>` : ""}
</td></tr>`;
}

/**
 * renderDigestEmail(digest, { base, unsubscribeUrl, prefsUrl }) → { subject, html, text }
 */
export function renderDigestEmail(d, { base, unsubscribeUrl, prefsUrl } = {}) {
  const subject = digestSubject(d);
  const who = craftsTitle(d);
  const q = d.crafts.length ? `?crafts=${d.crafts.map((c) => c.slug).join(",")}` : "";
  const utm = `utm_source=email&utm_medium=digest&utm_campaign=${d.edition}`;
  const webUrl = `${base}/digest${q}${q ? "&" : "?"}${utm}`;
  const surveyUrl = `${base}/survey?${utm}`;
  const intro = who && d.items.length
    ? `${d.period.since} אצל מי שמזמין ${who}, ולמה זה רלוונטי.`
    : `${d.period.since} בתעשיית הקריאייטיב בישראל, ולמה זה רלוונטי.`;
  const preheader = d.tracked?.[0]?.headline || d.items[0]?.headline || (d.tenders?.[0] ? `מכרז פתוח: ${d.tenders[0].summary}` : "") || d.more[0]?.headline || intro;
  const id = sender();
  const unsub = unsubscribeUrl || `${base}/digest/settings`;

  const rows = [];
  if (d.tracked?.length) {
    rows.push(section("במעקב שלכם"));
    rows.push(...d.tracked.map((i) => itemRow(i, d)));
  }
  if (d.items.length) {
    rows.push(section(who ? "בתחומים שלכם" : d.period.updates));
    rows.push(...d.items.map((i) => itemRow(i, d)));
  }
  if (d.tenders?.length) {
    rows.push(section(who ? `מכרזים פתוחים ב${who}` : "מכרזים פתוחים"));
    rows.push(...d.tenders.map(tenderRow));
  }
  if (d.tools?.length) {
    rows.push(section("כלים ו־AI השבוע"));
    rows.push(...d.tools.map(toolRow));
  }
  if (d.more.length) {
    rows.push(section("עוד בתעשייה"));
    rows.push(...d.more.map((i) => itemRow(i, d)));
  }
  if (d.picks.length) {
    rows.push(section(who ? `מי מזמין ${who}` : "מותגים ומשרדים עם חדשות"));
    rows.push(...d.picks.map(pickRow));
  }
  if (d.added.total) {
    const link = `<a href="${esc(`${base}/companies?${utm}`)}" style="color:${C.accent};text-decoration:none;" class="acc">`;
    rows.push(`<tr><td style="padding:20px 24px 0;font:400 15px/1.7 ${FONT};color:${C.ink};" class="ink pad">${d.added.list.length
      ? `<b>נוספו למאגר:</b> ${d.added.list.map((o) => `<a href="${esc(o.href)}" style="color:${C.accent};text-decoration:none;" class="acc">${bdi(o.name)}</a>`).join(" · ")}`
      : `${link}המאגר גדל ${esc(d.period.span)} ב־${d.added.total} חברות ‹</a>`}</td></tr>`);
  }
  rows.push(`<tr><td style="padding:20px 24px 0;" class="pad">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:14px;" class="card">
    <tr><td style="padding:14px 18px;font:400 14px/1.6 ${FONT};color:${C.ink};" class="ink">
      <b>סקר התעריפים 2026:</b> 4 דקות, ורואים את התוצאות. <a href="${esc(surveyUrl)}" style="color:${C.accent};text-decoration:none;font-weight:600;" class="acc">לענות על הסקר ‹</a>
    </td></tr>
  </table>
</td></tr>`);

  const identity = [id.name, id.address].filter(Boolean).map(esc).join(" · ");
  const html = `<!doctype html>
<html lang="he" dir="rtl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&display=swap" rel="stylesheet"><!--<![endif]-->
<!--[if mso]><style>table,td,div,a,span{font-family:Arial,sans-serif !important;}</style><![endif]-->
<style>
  @media (prefers-color-scheme: dark) {
    .wm-l { display:none !important; } .wm-d { display:block !important; max-height:none !important; }
    .bg { background:#14111c !important; }
    .sheet { background:#1d1928 !important; }
    .card { background:#2a2438 !important; border-color:#3a3350 !important; }
    .ink { color:#f3f0fa !important; }
    .muted { color:#c9c2dc !important; }
    .acc { color:#c4a6ff !important; }
    .cta { background:#8217ff !important; color:#ffffff !important; }
  }
  [data-ogsc] .ink { color:#f3f0fa !important; }
  [data-ogsc] .muted { color:#c9c2dc !important; }
  [data-ogsc] .acc { color:#c4a6ff !important; }
  @media (max-width: 480px) { .pad { padding-left:16px !important; padding-right:16px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};" class="bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};" class="bg" dir="rtl">
<tr><td align="center" style="padding:24px 12px;">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:20px;" class="sheet">
    <tr><td style="padding:28px 24px 0;" class="pad">
      ${wordmarkImg(base)}
    </td></tr>
    <tr><td style="padding:20px 24px 0;font:700 28px/1.25 ${FONT};color:${C.ink};" class="ink pad">${esc(d.period.title)}</td></tr>
    <tr><td style="padding:8px 24px 0;font:400 16px/1.6 ${FONT};color:${C.muted};" class="muted pad">${esc(d.range)} · ${esc(intro)}</td></tr>
    ${rows.join("\n")}
    <tr><td style="padding:28px 24px 8px;" align="center">
      <a href="${esc(webUrl)}" class="cta" style="display:inline-block;background:${C.ink};color:#ffffff;font:700 16px/1 ${FONT};padding:16px 28px;border-radius:999px;text-decoration:none;">לכל העדכונים באתר</a>
    </td></tr>
    <tr><td style="padding:24px;border-top:1px solid ${C.line};font:400 13px/1.7 ${FONT};color:${C.muted};" class="muted pad">
      קיבלתם את המייל כי נרשמתם ל״השבוע בתעשייה״${who ? ` בתחומים: ${esc(who)}` : ""}.
      המידע לקוח ממקורות פומביים, עם קישור למקור בכל עדכון.<br>
      ${prefsUrl ? `<a href="${esc(prefsUrl)}" style="color:${C.muted};" class="muted">שינוי תחומים ותדירות</a> · ` : ""}<a href="${esc(unsub)}" style="color:${C.muted};" class="muted">הסרה מהרשימה</a> · <a href="${esc(`${base}/privacy`)}" style="color:${C.muted};" class="muted">פרטיות</a>
      <br>${identity ? `${identity} · ` : ""}${id.contact ? `<a href="mailto:${esc(id.contact)}" style="color:${C.muted};" class="muted">${esc(id.contact)}</a> · ` : ""}<span dir="ltr">${esc(base.replace(/^https?:\/\//, ""))}</span>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  const t = [];
  t.push(`${d.period.title} (${d.range})`, intro, "");
  if (d.tracked?.length) {
    t.push("במעקב שלכם:", "");
    for (const i of d.tracked) { t.push(`${i.label} · ${i.day}: ${i.headline}`); if (i.org?.href) t.push(i.org.href); t.push(""); }
  }
  if (d.items.length) t.push(who ? "בתחומים שלכם:" : `${d.period.updates}:`, "");
  for (const i of [...d.items, ...d.more]) {
    t.push(`${i.label} · ${i.day}${i.late ? ` (הגיע אלינו ${d.period.span})` : ""}: ${i.headline}`);
    if (i.why) t.push(clip(i.why, WHY_MAX));
    if (i.org?.href) t.push(i.org.href);
    t.push("");
  }
  if (d.tenders?.length) {
    t.push(who ? `מכרזים פתוחים ב${who}:` : "מכרזים פתוחים:");
    for (const x of d.tenders) t.push(`- ${x.summary.replace(/[.\s]+$/, "")} (${x.buyer}). ${x.state === "upcoming" ? (x.when || x.countdown) : `${x.countdown}, הגשה עד ${x.deadline}`}. ${x.url}`);
    t.push("");
  }
  if (d.picks.length) {
    t.push(who ? `מי מזמין ${who}:` : "מותגים ומשרדים עם חדשות:");
    for (const p of d.picks) t.push(`- ${p.org.name}: ${clip(p.reason, WHY_MAX)} ${p.org.href}`);
    t.push("");
  }
  if (d.tools?.length) {
    t.push("כלים ו־AI השבוע:");
    for (const u of d.tools) t.push(`- ${u.tool} · ${u.day}: ${u.headline} ${u.source_url}`);
    t.push("");
  }
  if (d.added.total) t.push(`נוספו למאגר ${d.period.span}: ${d.added.total} חברות. ${base}/companies`, "");
  t.push(`סקר התעריפים 2026: 4 דקות, ורואים את התוצאות. ${surveyUrl}`, "");
  t.push(`לכל העדכונים: ${webUrl}`, "", `הסרה מהרשימה: ${unsub}`);
  if (identity || id.contact) t.push("", [id.name, id.address, id.contact].filter(Boolean).join(" · "));
  return { subject, html, text: t.join("\n") };
}
