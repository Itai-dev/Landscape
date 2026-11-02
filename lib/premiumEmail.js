// Premium's transactional emails, in the alert email's look: the confirmation after joining (the written
// details of the deal that consumer protection law asks for), the confirmation of a cancellation, and the
// reminder 30 days before a yearly plan renews. Each carries the business details. Server only.
import { wordmarkImg } from "@/lib/mailer";
import { business } from "@/lib/business";
import { PLANS, BENEFITS, REFUND_DAYS, TAX, shekels } from "@/lib/premium";

const C = { ink: "#110034", muted: "#5b5675", line: "#e6e2ef", bg: "#f7f6fa", white: "#ffffff" };
const FONT = "'Google Sans', Arial, 'Helvetica Neue', sans-serif";
const DAY = 864e5;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const day = (iso) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });

const price = (plan, amount) => `${shekels(amount ?? PLANS[plan].price)} ${PLANS[plan].per}`;
const cancelWays = (email) => `אפשר לבטל בכל רגע באזור האישי, בלחיצה אחת ובלי דמי ביטול${email ? `, או במייל ל־${email}, ונבטל בתוך 3 ימי עסקים` : ""}.`;
const afterRefundWindow = (plan) => plan === "yearly"
  ? "אחרי זה, ביטול מחזיר את החודשים שעוד לא התחילו, והפרימיום פעיל עד סוף החודש שכבר התחיל."
  : "אחרי זה, אחרי ביטול לא נחייב יותר, והפרימיום פעיל עד סוף החודש ששולם.";

function identity() {
  const b = business();
  return [b.name, b.id ? `עוסק פטור ${b.id}` : "", b.address].filter(Boolean);
}

// The frame every premium email shares: wordmark, title, paragraphs, optional detail rows, a button, the footer.
function shell({ subject, title, paras = [], rows = [], cta, base }) {
  const b = business();
  const ids = identity();
  const p = (x) => `<tr><td style="padding:8px 24px;font:400 16px/1.6 ${FONT};color:${C.ink};" class="ink pad">${esc(x)}</td></tr>`;
  const table = rows.length ? `<tr><td style="padding:12px 24px;" class="pad"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:12px;">${
    rows.map(([k, v], i) => `<tr><td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font:700 14px/1.5 ${FONT};color:${C.muted};width:30%;vertical-align:top;" class="muted">${esc(k)}</td><td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font:400 15px/1.5 ${FONT};color:${C.ink};" class="ink">${esc(v)}</td></tr>`).join("")
  }</table></td></tr>` : "";
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
    .wm-l { display:none !important; } .wm-d { display:block !important; max-height:none !important; }
    .bg { background:#14111c !important; } .sheet { background:#1d1928 !important; }
    .ink { color:#f3f0fa !important; } .muted { color:#c9c2dc !important; }
    .cta { background:#8217ff !important; color:#ffffff !important; }
  }
  [data-ogsc] .ink { color:#f3f0fa !important; } [data-ogsc] .muted { color:#c9c2dc !important; }
  @media (max-width: 480px) { .pad { padding-left:16px !important; padding-right:16px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};" class="bg">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};" class="bg" dir="rtl">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:20px;" class="sheet">
    <tr><td style="padding:28px 24px 0;" class="pad">${wordmarkImg(base)}</td></tr>
    <tr><td style="padding:20px 24px 4px;font:700 26px/1.25 ${FONT};color:${C.ink};" class="ink pad">${esc(title)}</td></tr>
    ${paras.slice(0, 1).map(p).join("")}
    ${table}
    ${paras.slice(1).map(p).join("")}
    ${cta ? `<tr><td style="padding:20px 24px 8px;" align="center"><a href="${esc(cta.href)}" class="cta" style="display:inline-block;background:${C.ink};color:#ffffff;font:700 16px/1 ${FONT};padding:16px 28px;border-radius:999px;text-decoration:none;">${esc(cta.label)}</a></td></tr>` : ""}
    <tr><td style="padding:24px;border-top:1px solid ${C.line};font:400 13px/1.7 ${FONT};color:${C.muted};" class="muted pad">
      מייל על המנוי שלכם לפרימיום ב־<span dir="ltr">CreativeIn</span>. <a href="${esc(`${base}/terms`)}" style="color:${C.muted};" class="muted">תנאי השימוש</a> · <a href="${esc(`${base}/privacy`)}" style="color:${C.muted};" class="muted">פרטיות</a>
      <br>${ids.map(esc).join(" · ")}${b.email ? ` · <a href="mailto:${esc(b.email)}" style="color:${C.muted};" class="muted">${esc(b.email)}</a>` : ""}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
  const text = [title, "", paras[0] || "", ...rows.map(([k, v]) => `${k}: ${v}`), "", ...paras.slice(1), "",
    cta ? `${cta.label}: ${cta.href}` : "", `תנאי השימוש: ${base}/terms`, "", [...ids, b.email].filter(Boolean).join(" · ")].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
  return { subject, html, text };
}

/** After joining: the details of the deal, how to cancel and the refund rules. */
export function confirmationEmail({ plan, amount, startedAt, periodEnd, base }) {
  const b = business();
  const refundBy = new Date(new Date(startedAt).getTime() + REFUND_DAYS * DAY).toISOString();
  return shell({
    base,
    subject: "הפרימיום פעיל: פרטי המנוי",
    title: "הפרימיום פעיל",
    paras: [
      "תודה שהצטרפתם. אלה פרטי המנוי, כדאי לשמור את המייל.",
      `ביטול עד ${day(refundBy)} מחזיר את כל הסכום, והפרימיום נסגר מיד. ${afterRefundWindow(plan)}`,
      cancelWays(b.email),
      `${TAX.receipt} על התשלום נשלחת בנפרד, מחברת הסליקה.`,
    ],
    rows: [
      ["מסלול", PLANS[plan].label],
      ["מחיר", `${price(plan, amount)}. ${TAX.note}`],
      ["הצטרפות", day(startedAt)],
      ["חידוש", `${day(periodEnd)}, אוטומטית ובאותו מחיר, עד שמבטלים`],
      ["מה כלול", BENEFITS.map((x) => x.title).join(", ")],
    ],
    cta: { label: "ניהול המנוי", href: `${base}/me#plan` },
  });
}

/** After cancelling: when premium ends and what comes back. */
export function cancellationEmail({ outcome, plan, base }) {
  const until = day(outcome.until);
  const first = outcome.kind === "full"
    ? `המנוי בוטל והפרימיום נסגר. נחזיר את כל הסכום, ${shekels(outcome.refund)}, לכרטיס שחויב.`
    : outcome.kind === "prorata"
      ? `המנוי בוטל, ולא נחייב יותר. נחזיר ${shekels(outcome.refund)} על ${outcome.months === 1 ? "חודש אחד" : `${outcome.months} חודשים`} שעוד לא התחילו. הפרימיום פעיל עד ${until}.`
      : `המנוי בוטל, ולא נחייב יותר. הפרימיום פעיל עד ${until}.`;
  return shell({
    base,
    subject: "המנוי לפרימיום בוטל",
    title: "המנוי בוטל",
    paras: [
      first,
      ...(outcome.refund > 0 ? [`ההחזר יגיע לכרטיס בתוך ${REFUND_DAYS} יום. הזמן עד שהוא מופיע בפירוט החיובים תלוי בחברת האשראי.`] : []),
      "אחרי זה החשבון חוזר לחינם: החברות שכבר במעקב נשארות, וההתראות עליהן ממשיכות פעם ביום.",
    ],
    rows: [["מסלול", PLANS[plan]?.label || ""]],
    cta: { label: "לאזור האישי", href: `${base}/me#plan` },
  });
}

/** 30 days before a yearly plan renews. */
export function renewalEmail({ periodEnd, amount, base }) {
  const b = business();
  return shell({
    base,
    subject: `המנוי השנתי לפרימיום מתחדש ב־${day(periodEnd)}`,
    title: "המנוי השנתי מתחדש בקרוב",
    paras: [
      `המנוי השנתי לפרימיום מתחדש אוטומטית ב־${day(periodEnd)}. כדי להמשיך לא צריך לעשות כלום.`,
      `כדי שלא יתחדש, בטלו באזור האישי לפני התאריך. ${cancelWays(b.email)}`,
      "גם אחרי החידוש אפשר לבטל בכל רגע, ואז נחזיר את החודשים שעוד לא התחילו.",
    ],
    rows: [["חידוש", day(periodEnd)], ["מחיר", `${price("yearly", amount)}. ${TAX.note}`]],
    cta: { label: "ניהול המנוי", href: `${base}/me#plan` },
  });
}
