import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { surveyAggregate, myState } from "@/lib/survey/server";
import { K_MIN, TEASER_MIN, UNLOCK_REFERRALS, RESULTS_LABEL, isOpen } from "@/lib/survey/config";
import ShareInvite from "../ShareInvite";
import RefCapture from "@/components/RefCapture";

export const dynamic = "force-dynamic";

const TITLE = "תוצאות סקר התעריפים ותנאי התשלום 2026";
const DESC = "כמה גובים במושן, אנימציה, VFX, פוסט, סאונד ועיצוב בישראל, מה תנאי התשלום המקובלים ואיפה מאחרים. נתונים מצטברים, אנונימיים.";
export const metadata = {
  title: TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC, type: "article", locale: "he_IL", siteName: "Landscape" },
  twitter: { card: "summary", title: TITLE, description: DESC },
};

const ils = (v) => (v == null ? "—" : `₪${Math.round(v).toLocaleString("he-IL")}`);
const pct = (x) => `${Math.round(x * 100)}%`;
const NOT_ENOUGH = "אין מספיק תשובות עדיין";

function Range({ s }) {
  if (!s || s.hidden) return <span className="muted small">{NOT_ENOUGH}</span>;
  return (
    <span className="range">
      <b className="mono">{ils(s.median)}</b>
      {s.p75 > s.p25 && <span className="small muted mono"><bdi dir="ltr">{ils(s.p25)}–{ils(s.p75)}</bdi></span>}
    </span>
  );
}

function Bars({ d, empty = NOT_ENOUGH }) {
  if (!d || d.hidden || !d.rows?.length) return <p className="muted small">{empty}</p>;
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

function Full({ agg }) {
  const rates = agg.rates;
  return (
    <div className="stack results">
      <Section title="תעריפים של עצמאים" note="חציון, ומתחתיו הטווח שבין הרבע התחתון לרבע העליון. לפני מע״מ.">
        {rates.length ? (
          <div className="tablewrap">
            <table className="rtable">
              <thead><tr><th>תחום</th><th>צורת עבודה</th><th>לשעה</th><th>ליום</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={`${r.craft}-${r.mode}`}>
                    <th scope="row">{r.craftHe}{!r.hidden && <span className="small muted"> · {r.n} משיבים</span>}</th>
                    <td>{r.modeHe}</td>
                    {r.hidden ? <td colSpan={2} className="muted small">{NOT_ENOUGH}</td> : <><td><Range s={r.hourly} /></td><td><Range s={r.daily} /></td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">{NOT_ENOUGH}</p>}
      </Section>

      <Section title="שכר חודשי בשכירות" note="ברוטו, משרה מלאה. חציון וטווח.">
        {agg.salaries.length ? (
          <div className="tablewrap">
            <table className="rtable">
              <thead><tr><th>תחום</th><th>איפה</th><th>שכר</th></tr></thead>
              <tbody>
                {agg.salaries.map((r) => (
                  <tr key={`${r.craft}-${r.mode}`}>
                    <th scope="row">{r.craftHe}{!r.hidden && <span className="small muted"> · {r.n} משיבים</span>}</th>
                    <td>{r.modeHe}</td>
                    <td>{r.hidden ? <span className="muted small">{NOT_ENOUGH}</span> : <Range s={r.salary} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">{NOT_ENOUGH}</p>}
      </Section>

      <Section title="כמה עולות עבודות נפוצות" note="פרויקט שלם, לפני מע״מ. חציון וטווח.">
        {agg.prices.length ? (
          <div className="tablewrap">
            <table className="rtable">
              <thead><tr><th>עבודה</th><th>תחום</th><th>מחיר</th></tr></thead>
              <tbody>
                {agg.prices.map((p) => (
                  <tr key={`${p.craft}-${p.deliverable}`}>
                    <th scope="row">{p.deliverableHe}</th>
                    <td>{p.craftHe}</td>
                    <td><Range s={p} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted small">{NOT_ENOUGH}</p>}
      </Section>

      <div className="grid fit">
        <Section title="תנאי תשלום" note="מה שרוב הלקוחות מקבלים בפועל. עצמאים ובעלי סטודיו."><Bars d={agg.terms} /></Section>
        <Section title="כמה מהחשבוניות מאחרות"><Bars d={agg.late} /></Section>
        <Section title="כמה זמן נמשך איחור" note="בקרב מי שיש לו איחורים."><Bars d={agg.delay} /></Section>
        <Section title="מי הלקוחות" note="אפשר היה לבחור כמה."><Bars d={agg.clients} /></Section>
        <Section title="איך לקוחות מגיעים" note="עצמאים ובעלי סטודיו, עד 3 תשובות."><Bars d={agg.channelsIndependent} /></Section>
        <Section title="איך מצאו את העבודה" note="שכירים, עד 3 תשובות."><Bars d={agg.channelsEmployed} /></Section>
        <Section title="AI והביקוש לעבודה"><Bars d={agg.aiDemand} /></Section>
        <Section title="AI והתעריפים"><Bars d={agg.aiRates} /></Section>
      </div>
    </div>
  );
}

export default async function Results() {
  const admin = adminClient();
  const sb = await serverClient();
  const user = await currentUser(sb).catch(() => null);
  const [agg, state] = await Promise.all([
    surveyAggregate(admin).catch(() => null),
    user ? myState(sb, admin, user).catch(() => null) : null,
  ]);
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
        <span className="eyebrow">{isOpen() ? "תוצאות ביניים · מתעדכנות כל כמה דקות" : "תוצאות סופיות"}</span>
        <h1>תוצאות סקר התעריפים ותנאי התשלום 2026</h1>
        <p>
          {n ? `${n.toLocaleString("he-IL")} תשובות עד עכשיו. ` : ""}
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

      {admin && (state?.unlocked ? (
        <>
          <div className="section tight"><Full agg={agg} /></div>
          <div className="wrap narrow" style={{ paddingInline: 0 }}><ShareInvite /></div>
        </>
      ) : (
        <div className="section tight wrap narrow stack" style={{ paddingInline: 0 }}>
          <div className="soon">
            <h2>התוצאות המלאות פתוחות למי שעונה</h2>
            <p>
              טבלאות לפי תחום וצורת עבודה, מחירים של עבודות נפוצות, תנאי תשלום ואיחורים. 4 דקות, אנונימי.
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
