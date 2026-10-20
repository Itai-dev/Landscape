import PersonCard from "@/components/PersonCard";
import SeedCard from "@/components/SeedCard";
import AutoSelect from "@/components/AutoSelect";
import ComingSoon from "@/components/ComingSoon";
import { SearchIcon } from "@/components/Icons";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";
import { ROLE_TYPES, searchSeeds } from "@/lib/people";
import { loadMembers, hiddenSeeds } from "@/lib/members";

export const metadata = {
  title: "אנשים",
  description: "אנשי מקצוע בתעשיית הקריאייטיב בישראל: מושן, אנימציה, פוסט, מיתוג, סאונד, הפקה ושיווק.",
};

const PAGE = 24;

export default async function People({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || "").slice(0, 80).trim();
  const craft = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  const role = ROLE_TYPES.some((r) => r.slug === sp?.role) ? sp.role : "";
  const page = Math.max(1, Math.min(50, Number.parseInt(sp?.page, 10) || 1));

  const [{ configured, user, members, error }, hidden] = await Promise.all([
    role ? { configured: true, user: null, members: [], error: null } : loadMembers({ q, craft }),
    hiddenSeeds(),
  ]);
  const seeds = searchSeeds({ q, craft, role, exclude: hidden });
  const shown = seeds.slice(0, page * PAGE);
  const href = (over) => {
    const p = { ...(q ? { q } : {}), ...(craft ? { craft } : {}), ...(role ? { role } : {}), ...over };
    Object.keys(p).forEach((k) => !p[k] && delete p[k]);
    const s = new URLSearchParams(p).toString();
    return s ? `/people?${s}` : "/people";
  };
  const filtered = Boolean(q || craft || role);

  return (
    <div className="wrap">
      <div className="pagehead">
        <h1>אנשים בתעשייה</h1>
        <p>מושן, אנימציה, פוסט, מיתוג, סאונד, הפקה ושיווק. לפי שם, תפקיד, חברה או תחום.</p>
      </div>

      <form className="toolbar" role="search" action="/people">
        <div className="psearch">
          <input type="search" name="q" defaultValue={q} placeholder="חיפוש באנשים: שם, תפקיד או חברה" aria-label="חיפוש באנשים" />
          <button className="go" aria-label="חיפוש"><SearchIcon size={20} /></button>
        </div>
        <AutoSelect name="craft" defaultValue={craft} aria-label="תחום">
          <option value="">כל התחומים</option>
          {CRAFTS.map((c) => <option key={c.slug} value={c.slug}>{c.he}</option>)}
        </AutoSelect>
        {role && <input type="hidden" name="role" value={role} />}
      </form>
      <nav className="popular" aria-label="סינון לפי תפקיד">
        <a className={`tag${role ? "" : " on"}`} href={href({ role: "", page: "" })} aria-current={role ? undefined : "true"}>כל התפקידים</a>
        {ROLE_TYPES.map((r) => (
          <a key={r.slug} className={`tag${role === r.slug ? " on" : ""}`} href={href({ role: r.slug, page: "" })} aria-current={role === r.slug ? "true" : undefined}>{r.he}</a>
        ))}
      </nav>

      {!role && (
        <section aria-labelledby="members-h">
          <div className="subhead">
            <h2 id="members-h">חברי הקהילה</h2>
            <p>פרופילים שבעליהם בנו בעצמם</p>
          </div>
          {!configured && <ComingSoon text="בינתיים אפשר להכיר את האנשים שכבר במאגר, כאן למטה, ולעבור על החברות." />}
          {error && <div className="notice err">לא הצלחנו לטעון את חברי הקהילה כרגע. נסו לרענן.</div>}
          {configured && !error && members.length === 0 && (
            <div className="soon">
              <h3>{filtered ? "אין חברי קהילה שמתאימים לחיפוש" : "עוד אין חברי קהילה. הפרופיל הראשון יכול להיות שלכם."}</h3>
              <p>{filtered ? "אפשר לבדוק את האנשים מפרסומים פומביים, כאן למטה." : "פרופיל אישי מופיע ראשון, עם תחומים, עבודות וקישורים."}</p>
              <a className="btn primary" href="/onboard">בניית פרופיל</a>
            </div>
          )}
          {members.length > 0 && <div className="grid">{members.map((p) => <PersonCard key={p.slug} p={p} />)}</div>}
          {configured && !user && members.length > 0 && (
            <p className="small muted center" style={{ marginBlockStart: 24 }}>
              חלק מהפרופילים גלויים רק לחברי קהילה. <a href="/onboard">ההצטרפות</a> לוקחת דקה.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="seeds-h">
        <div className="subhead">
          <h2 id="seeds-h">מפרסומים פומביים</h2>
          <p>
            {seeds.length} אנשים, לפי תפקידים שפורסמו באתרי החברות ובעיתונות המקצועית. בלי פרטי קשר.{" "}
            <a href="/privacy#public">איך זה עובד</a>
          </p>
        </div>
        {seeds.length === 0 ? (
          <div className="soon">
            <h3>לא מצאנו אנשים{craft ? ` ב${craftLabel(craft)}` : ""}{q ? <> עבור <bdi>״{q}״</bdi></> : ""}</h3>
            <p>אפשר לנסות מילה אחרת, או לחפש את החברה עצמה.</p>
            <a className="btn" href={`/search?q=${encodeURIComponent(q)}`}>חיפוש בכל האתר</a>
          </div>
        ) : (
          <>
            <div className="pgrid">{shown.map((p) => <SeedCard key={p.id} p={p} />)}</div>
            {shown.length < seeds.length && (
              <div className="pager"><a className="btn" href={href({ page: String(page + 1) })}>עוד אנשים</a></div>
            )}
            <p className="small muted center" style={{ marginBlockStart: 32 }}>
              מופיעים כאן? אפשר לבנות פרופיל מלא בלחיצה על ״זה אני״, או לבקש הסרה מהתפריט שבכרטיס.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
