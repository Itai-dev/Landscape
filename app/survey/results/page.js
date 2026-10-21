import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { surveyResults, myState } from "@/lib/survey/server";
import { K_MIN, TEASER_MIN, UNLOCK_REFERRALS, RESULTS_LABEL, isOpen } from "@/lib/survey/config";
import ShareInvite from "../ShareInvite";
import RefCapture from "@/components/RefCapture";

export const dynamic = "force-dynamic";

const TITLE = "תוצאות סקר התעריפים ותנאי התשלום 2026";
const DESC = "כמה גובים במושן, אנימציה, VFX, פוסט, סאונד ועיצוב בישראל, מה תנאי התשלום המקובלים ואיפה מאחרים. נתונים מצטברים בלבד.";
export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/survey/results" },
  openGraph: { title: TITLE, description: DESC, type: "article", locale: "he_IL", siteName: "CreativeIn", images: [{ url: "/og/survey.png", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og/survey.png"] },
};

const ils = (v) => (v == null ? "—" : `₪${Math.round(v).toLocaleString("he-IL")}`);
const pct = (x) => `${Math.round(x * 100)}%`;
const nLabel = (nb) => (nb ? `${nb}+ משיבים` : "");
const dayLabel = (iso) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(new Date(iso));

function Range({ s }) {
  if (!s) return <span className="muted small">—</span>;
  return (
    <span className="range">
      <b className="mono">{ils(s.median)}</b>
      {s.p75 > s.p25 && <span className="small muted mono"><bdi dir="ltr">{ils(s.p25)}–{ils(s.p75)}</bdi></span>}
    </span>
  );
}

function Bars({ d }) {
  if (!d?.rows?.length) return null;
  return (
    <ul className="bars">
      {d.rows.map((r) => (
        <li key={r.slug}>
          <span className="lbl">{r.he}</span>
          <span className="bar" aria-hidden><span style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }} /></span>
          <span className="val mono">{pct(r.share)}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="card stack res">
      <h2>{title}</h2>
      {note && <p className="small muted">{note}</p>}
      {children}
    </section>
  );
}

// Tables on wide screens; on phones each row is a card (CSS: .rtable → stacked under 640px).
function Table({ head, rows }) {
  return (
    <table className="rtable">
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.title}{r.nb ? <span className="small muted"> · {nLabel(r.nb)}</span> : null}</th>
            {r.cells.map((c, i) => <td key={i} data-label={head[i + 1]}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Full({ agg }) {
  const bars = [
    ["תנאי תשלום", "מה שרוב הלקוחות מקבלים בפועל. עצמאים ובעלי סטודיו.", agg.terms],
    ["כמה מהחשבוניות מאחרות", null, agg.late],
    ["כמה זמן נמשך איחור", "בקרב מי שדיווחו על איחורים.", agg.delay],
    ["מי הלקוחות", "אפשר היה לבחור כמה.", agg.clients],
    ["איך לקוחות מגיעים", "עצמאים ובעלי סטודיו, עד 3 תשובות.", agg.channelsIndependent],
    ["איך מצאו את העבודה", "שכירים, עד 3 תשובות.", agg.channelsEmployed],
    ["AI והביקוש לעבודה", null, agg.aiDemand],
    ["AI והתעריפים", null, agg.aiRates],
  ].filter(([, , d]) => d?.rows?.length);
  return (
    <div className="stack results">
      {agg.rates.length > 0 && (
        <Section title="תעריפים של עצמאים" note="חציון, ומתחתיו הטווח שבין הרבע התחתון לרבע העליון. לפני מע״מ.">
          <Table head={["תחום", "צורת עבודה", "לשעה", "ליום"]}
            rows={agg.rates.map((r) => ({ key: `${r.craft}-${r.mode}`, title: r.craftHe, nb: r.nb, cells: [r.modeHe, <Range key="h" s={r.hourly} />, <Range key="d" s={r.daily} />] }))} />
        </Section>
      )}
      {agg.salaries.length > 0 && (
        <Section title="שכר חודשי בשכירות" note="ברוטו, משרה מלאה. חציון וטווח.">
          <Table head={["תחום", "איפה", "שכר"]}
            rows={agg.salaries.map((r) => ({ key: `${r.craft}-${r.mode}`, title: r.craftHe, nb: r.nb, cells: [r.modeHe, <Range key="s" s={r.salary} />] }))} />
        </Section>
      )}
      {agg.prices.length > 0 && (
        <Section title="כמה עולות עבודות נפוצות" note="פרויקט שלם, לפני מע״מ. חציון וטווח.">
          <Table head={["עבודה", "תחום", "מחיר"]}
            rows={agg.prices.map((p) => ({ key: `${p.craft}-${p.deliverable}`, title: p.deliverableHe, nb: p.nb, cells: [p.craftHe, <Range key="p" s={p} />] }))} />
        </Section>
      )}
      {bars.length > 0 && (
        <div className="grid fit">
          {bars.map(([title, note, d]) => <Section key={title} title={title} note={note}><Bars d={d} /></Section>)}
        </div>
      )}
      <p className="small muted center">קבוצות עם פחות מ־{K_MIN} משיבים לא מוצגות. האחוזים מעוגלים ל־5%, וגודל כל קבוצה מוצג בטווח.</p>
    </div>
  );
}

export default async function Results() {
  const admin = adminClient();
  const sb = await serverClient();
  const user = await currentUser(sb).catch(() => null);
  const res = await surveyResults(admin).catch(() => null);
  const agg = res?.data || null;
  const state = user ? await myState(sb, admin, user, res?.at || null).catch(() => null) : null;
  const n = agg?.n || 0;
  const h = agg?.headline || {};
  const teaser = n >= TEASER_MIN;
  const kpis = [
    h.freelanceHourlyMedian != null && { v: ils(h.freelanceHourlyMedian), l: "תעריף חציוני לשעה של פרילנסרים" },
    h.slowTermsShare != null && { v: pct(h.slowTermsShare), l: "מקבלים תשלום בשוטף + 60 או יותר" },
    h.lateShare != null && { v: pct(h.lateShare), l: "מדווחים על חשבוניות שמשולמות באיחור" },
  ].filter(Boolean);

  return (
    <div className="wrap">
      <RefCapture />
      <div className="pagehead">
        <span className="eyebrow">{isOpen() ? "תוצאות ביניים · מתעדכנות פעם ביום" : "תוצאות סופיות"}</span>
        <h1>תוצאות סקר התעריפים ותנאי התשלום 2026</h1>
        <p>
          {agg?.nb ? `${agg.nb}+ תשובות${res?.at ? `, נכון ל־${dayLabel(res.at)}` : ""}. ` : ""}
          כל המספרים מצטברים, ומוצגים רק לקבוצות של {K_MIN} משיבים לפחות.
        </p>
      </div>

      {!admin && (
        <div className="soon">
          <h3>התוצאות יופיעו כאן</h3>
          <p>הסקר עוד לא נפתח. הדוח המלא יתפרסם ב{RESULTS_LABEL}.</p>
          <a className="btn primary" href="/survey">לעמוד הסקר</a>
        </div>
      )}

      {admin && (teaser && kpis.length ? (
        <div className="kpis res-kpis">
          {kpis.map((k) => <div key={k.l} className="kpi"><b className="mono">{k.v}</b><span>{k.l}</span></div>)}
        </div>
      ) : (
        <p className="center muted">המספרים הראשונים יוצגו כאן לכולם מ־{TEASER_MIN} תשובות.</p>
      ))}

      {admin && agg && (state?.unlocked ? (
        <>
          <div className="section tight"><Full agg={agg} /></div>
          <div className="wrap narrow" style={{ paddingInline: 0 }}><ShareInvite /></div>
        </>
      ) : (
        <div className="section tight wrap narrow stack" style={{ paddingInline: 0 }}>
          <div className="soon">
            <h2>התוצאות המלאות פתוחות למי שעונה</h2>
            <p>
              טבלאות לפי תחום וצורת עבודה, מחירים של עבודות נפוצות, תנאי תשלום ואיחורים. 4 דקות, והתשובות חסויות.
              {` אפשר גם להזמין ${UNLOCK_REFERRALS} אנשים שעונים על הסקר.`}
            </p>
            <a className="btn primary lg" href="/survey">לענות על הסקר</a>
          </div>
          {user && <ShareInvite showCounter />}
        </div>
      ))}
    </div>
  );
}
