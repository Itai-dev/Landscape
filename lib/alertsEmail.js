// The alert email: updates on companies a person follows, in the same look as the digest (RTL, tables,
// inline styles, MSO wrapper, dark-mode safe), with a plain-text part and the sender's identity. Server only.
import { bidiHtml, clip } from "@/lib/bidi";
import { sender, wordmarkImg } from "@/lib/mailer";
import { alertSubject } from "@/lib/alerts";

const C = { ink: "#110034", muted: "#5b5675", accent: "#8217ff", soft: "#f4f1fb", line: "#e6e2ef", bg: "#f7f6fa", white: "#ffffff" };
const FONT = "'Google Sans', Arial, 'Helvetica Neue', sans-serif";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bdi = (s) => `<bdi>${esc(s)}</bdi>`;
const WHY_MAX = 140;

function itemRow(i) {
  const org = `<a href="${esc(i.org.href)}" style="color:${C.accent};text-decoration:none;font-weight:600;" class="acc">${bdi(i.org.name)}</a>`;
  const also = i.also.length ? ` · גם: ${i.also.map((o) => `<a href="${esc(o.href)}" style="color:${C.accent};text-decoration:none;" class="acc">${bdi(o.name)}</a>`).join(", ")}` : "";
  const src = i.source_url ? ` · <a href="${esc(i.source_url)}" style="color:${C.muted};" class="muted">${bdi(i.source || "מקור")}</a>` : "";
  return `<tr><td style="padding:8px 24px;" class="pad">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:14px;" class="card">
    <tr><td style="padding:16px 18px;font:400 15px/1.6 ${FONT};color:${C.ink};" class="ink">
      <div style="font:600 13px/1.4 ${FONT};color:${C.accent};margin-bottom:6px;" class="acc">${esc(i.label)} · ${esc(i.day)}</div>
      <div style="font-weight:600;margin-bottom:6px;">${bidiHtml(i.headline)}</div>
      ${i.why ? `<div style="color:${C.muted};margin-bottom:8px;" class="muted">${bidiHtml(clip(i.why, WHY_MAX))}</div>` : ""}
      <div style="font-size:14px;color:${C.muted};" class="muted">${org}${also}${src}</div>
    </td></tr>
  </table>
</td></tr>`;
}

/**
 * renderAlertEmail(items, { mode, base, unsubscribeUrl, manageUrl }) → { subject, html, text }
 */
export function renderAlertEmail(items, { mode = "daily", base, unsubscribeUrl, manageUrl } = {}) {
  const subject = alertSubject(items, mode);
  const id = sender();
  const manage = manageUrl || `${base}/me`;
  const unsub = unsubscribeUrl || manage;
  const title = mode === "weekly" ? "השבוע בחברות שבחרתם" : items.length > 1 ? "עדכונים בחברות שבחרתם" : "עדכון בחברות שבחרתם";
  const intro = items.length === 1 ? "עדכון חדש על חברה שבחרתם לעקוב אחריה." : `${items.length} עדכונים חדשים על חברות שבחרתם לעקוב אחריהן.`;
  const identity = [id.name, id.address].filter(Boolean).map(esc).join(" · ");
  const utm = `utm_source=email&utm_medium=alert`;

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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(items[0]?.headline || intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};" class="bg" dir="rtl">
<tr><td align="center" style="padding:24px 12px;">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:20px;" class="sheet">
    <tr><td style="padding:28px 24px 0;" class="pad">
      ${wordmarkImg(base)}
    </td></tr>
    <tr><td style="padding:20px 24px 0;font:700 26px/1.25 ${FONT};color:${C.ink};" class="ink pad">${esc(title)}</td></tr>
    <tr><td style="padding:8px 24px 8px;font:400 16px/1.6 ${FONT};color:${C.muted};" class="muted pad">${esc(intro)}</td></tr>
    ${items.map(itemRow).join("\n")}
    <tr><td style="padding:24px 24px 8px;" align="center">
      <a href="${esc(`${base}/companies?${utm}`)}" class="cta" style="display:inline-block;background:${C.ink};color:#ffffff;font:700 16px/1 ${FONT};padding:16px 28px;border-radius:999px;text-decoration:none;">לכל החברות באתר</a>
    </td></tr>
    <tr><td style="padding:24px;border-top:1px solid ${C.line};font:400 13px/1.7 ${FONT};color:${C.muted};" class="muted pad">
      קיבלתם את המייל כי ביקשתם התראות על חברות שבחרתם ב־<span dir="ltr">CreativeIn</span>.
      המידע לקוח ממקורות פומביים, עם קישור למקור בכל עדכון.<br>
      <a href="${esc(manage)}" style="color:${C.muted};" class="muted">ניהול החברות וההתראות</a> · <a href="${esc(unsub)}" style="color:${C.muted};" class="muted">הפסקת ההתראות</a> · <a href="${esc(`${base}/privacy`)}" style="color:${C.muted};" class="muted">פרטיות</a>
      <br>${identity ? `${identity} · ` : ""}${id.contact ? `<a href="mailto:${esc(id.contact)}" style="color:${C.muted};" class="muted">${esc(id.contact)}</a> · ` : ""}<span dir="ltr">${esc(String(base).replace(/^https?:\/\//, ""))}</span>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  const t = [title, intro, ""];
  for (const i of items) {
    t.push(`${i.org.name} · ${i.label} · ${i.day}: ${i.headline}`);
    if (i.why) t.push(clip(i.why, WHY_MAX));
    t.push(i.org.href, "");
  }
  t.push(`ניהול החברות וההתראות: ${manage}`, `הפסקת ההתראות: ${unsub}`);
  if (identity || id.contact) t.push("", [id.name, id.address, id.contact].filter(Boolean).join(" · "));
  return { subject, html, text: t.join("\n") };
}
