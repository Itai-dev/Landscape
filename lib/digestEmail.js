// The digest as an email: RTL, table layout with inline styles (email clients), a plain-text part,
// and an unsubscribe link in the footer. Server only.
import { craftsTitle, fmtDay } from "@/lib/digest";

const C = { ink: "#110034", muted: "#5b5675", accent: "#8217ff", soft: "#f4f1fb", line: "#e6e2ef", bg: "#f7f6fa", white: "#ffffff" };
const FONT = "Heebo, Arial, 'Helvetica Neue', sans-serif";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bdi = (s) => `<bdi>${esc(s)}</bdi>`;

export function digestSubject(d) {
  const n = d.items.length;
  if (d.crafts.length) return n ? `השבוע בתעשייה: ${n} עדכונים ל${craftsTitle(d)}` : `השבוע בתעשייה: מי מזמין ${craftsTitle(d)}`;
  const lead = d.items[0]?.org?.name;
  return lead && n > 1 ? `השבוע בתעשייה: ${lead} ועוד ${n - 1} עדכונים` : "השבוע בתעשייה";
}

function section(title) {
  return `<tr><td style="padding:28px 24px 8px;font:700 18px/1.4 ${FONT};color:${C.ink};" class="ink">${esc(title)}</td></tr>`;
}

function itemRow(i) {
  const org = i.org?.href ? `<a href="${esc(i.org.href)}" style="color:${C.accent};text-decoration:none;font-weight:600;">${bdi(i.org.name)}</a>` : bdi(i.org?.name || "");
  const src = i.source_url ? ` · <a href="${esc(i.source_url)}" style="color:${C.muted};">${bdi(i.source || "מקור")}</a>` : "";
  return `<tr><td style="padding:8px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:14px;" class="card">
    <tr><td style="padding:16px 18px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
      <div style="font:600 13px/1.4 ${FONT};color:${C.accent};margin-bottom:6px;">${esc(i.label)} · ${esc(i.day)}</div>
      <div style="font-weight:600;margin-bottom:6px;">${esc(i.headline)}</div>
      ${i.why ? `<div style="color:${C.muted};margin-bottom:8px;" class="muted">${esc(i.why)}</div>` : ""}
      <div style="font-size:14px;color:${C.muted};" class="muted">${org}${src}</div>
    </td></tr>
  </table>
</td></tr>`;
}

function pickRow(p) {
  return `<tr><td style="padding:6px 24px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
  <a href="${esc(p.org.href)}" style="color:${C.ink};font-weight:700;text-decoration:none;" class="ink">${bdi(p.org.name)}</a>${p.craft ? ` <span style="color:${C.muted};font-size:13px;" class="muted">· ${esc(p.craft)}</span>` : ""}
  <div style="color:${C.muted};font-size:14px;" class="muted">${esc(p.reason)}</div>
</td></tr>`;
}

/**
 * renderDigestEmail(digest, { base, unsubscribeUrl, prefsUrl }) → { subject, html, text }
 */
export function renderDigestEmail(d, { base, unsubscribeUrl, prefsUrl, privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL } = {}) {
  const subject = digestSubject(d);
  const q = d.crafts.length ? `?crafts=${d.crafts.map((c) => c.slug).join(",")}` : "";
  const webUrl = `${base}/digest${q}${q ? "&" : "?"}utm_source=email&utm_medium=digest&utm_campaign=${d.edition}`;
  const range = `${fmtDay(d.from)}–${fmtDay(d.to)}`;
  const intro = d.crafts.length
    ? `מה השתנה אצל מי שמזמין ${craftsTitle(d)}, ולמה זה רלוונטי עכשיו.`
    : "מה השתנה בתעשיית הקריאייטיב בישראל, ולמה זה רלוונטי עכשיו.";
  const preheader = d.items[0]?.headline || intro;

  const rows = [];
  if (d.items.length) {
    rows.push(section(d.crafts.length ? "עדכונים בתחומים שלכם" : "עדכונים מהשבוע"));
    rows.push(...d.items.map(itemRow));
  }
  if (d.more.length) {
    rows.push(section("עוד בתעשייה"));
    rows.push(...d.more.map(itemRow));
  }
  if (d.picks.length) {
    rows.push(section(d.crafts.length ? `מי מזמין ${craftsTitle(d)} עכשיו` : "מותגים ומשרדים עם חדשות"));
    rows.push(...d.picks.map(pickRow));
  }
  if (d.newOrgs.total) {
    rows.push(section(`חדש במאגר: ${d.newOrgs.total} חברות`));
    rows.push(`<tr><td style="padding:4px 24px;font:400 15px/1.8 ${FONT};color:${C.ink};" class="ink">${d.newOrgs.list
      .map((o) => `<a href="${esc(o.href)}" style="color:${C.accent};text-decoration:none;">${bdi(o.name)}</a>`).join(" · ")}</td></tr>`);
  }

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background:#14111c !important; }
    .sheet { background:#1d1928 !important; }
    .card { background:#2a2438 !important; }
    .ink { color:#f3f0fa !important; }
    .muted { color:#bdb6cf !important; }
    .cta { background:#8217ff !important; }
  }
  @media (max-width: 480px) { .pad { padding-left:16px !important; padding-right:16px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};" class="bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};" class="bg" dir="rtl">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:20px;" class="sheet">
    <tr><td style="padding:28px 24px 0;" class="pad">
      <div style="font:800 22px/1 ${FONT};color:${C.ink};" class="ink" dir="ltr" align="right">Landscape<span style="color:${C.accent};">.</span></div>
    </td></tr>
    <tr><td style="padding:20px 24px 0;font:800 28px/1.25 ${FONT};color:${C.ink};" class="ink pad">השבוע בתעשייה</td></tr>
    <tr><td style="padding:8px 24px 0;font:400 16px/1.6 ${FONT};color:${C.muted};" class="muted pad">${esc(range)} · ${esc(intro)}</td></tr>
    ${rows.join("\n")}
    <tr><td style="padding:28px 24px 8px;" align="center">
      <a href="${esc(webUrl)}" class="cta" style="display:inline-block;background:${C.ink};color:#ffffff;font:700 16px/1 ${FONT};padding:16px 28px;border-radius:999px;text-decoration:none;">לגיליון המלא באתר</a>
    </td></tr>
    <tr><td style="padding:24px;border-top:1px solid ${C.line};font:400 13px/1.7 ${FONT};color:${C.muted};" class="muted pad">
      קיבלתם את המייל כי נרשמתם לעדכונים של Landscape${d.crafts.length ? ` בתחומים: ${esc(craftsTitle(d))}` : ""}.
      המידע לקוח ממקורות פומביים, עם קישור למקור בכל עדכון.<br>
      ${prefsUrl ? `<a href="${esc(prefsUrl)}" style="color:${C.muted};">שינוי תחומים ותדירות</a> · ` : ""}<a href="${esc(unsubscribeUrl || `${base}/privacy`)}" style="color:${C.muted};">הסרה מהרשימה</a> · <a href="${esc(`${base}/privacy`)}" style="color:${C.muted};">פרטיות</a>
      ${privacyEmail ? `<br>פניות: <a href="mailto:${esc(privacyEmail)}" style="color:${C.muted};">${esc(privacyEmail)}</a>` : ""}
      <br>Landscape · <span dir="ltr">${esc(base.replace(/^https?:\/\//, ""))}</span>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const t = [];
  t.push(`השבוע בתעשייה (${range})`, intro, "");
  for (const i of [...d.items, ...d.more]) {
    t.push(`${i.label} · ${i.day}: ${i.headline}`);
    if (i.why) t.push(i.why);
    if (i.org?.href) t.push(i.org.href);
    t.push("");
  }
  if (d.picks.length) {
    t.push(d.crafts.length ? `מי מזמין ${craftsTitle(d)} עכשיו:` : "מותגים ומשרדים עם חדשות:");
    for (const p of d.picks) t.push(`- ${p.org.name}: ${p.reason} ${p.org.href}`);
    t.push("");
  }
  if (d.newOrgs.total) t.push(`חדש במאגר: ${d.newOrgs.total} חברות`, "");
  t.push(`לגיליון המלא: ${webUrl}`, "", `הסרה מהרשימה: ${unsubscribeUrl || `${base}/privacy`}`);
  return { subject, html, text: t.join("\n") };
}
