import PersonCard from "@/components/PersonCard";
import SeedCard from "@/components/SeedCard";
import AutoSelect from "@/components/AutoSelect";
import { SearchIcon } from "@/components/Icons";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";
import { ROLE_TYPES, searchSeeds } from "@/lib/people";
import { loadMembers, hiddenSeeds } from "@/lib/members";
import { craftOfQuery } from "@/lib/match";
import { PROFILES_ENABLED } from "@/lib/config";

export const metadata = {
  title: "אנשים",
  description: "אנשי מקצוע בתעשיית הקריאייטיב בישראל: מושן, אנימציה, פוסט, מיתוג, סאונד, הפקה ושיווק.",
};

const PAGE = 24;

export default async function People({ searchParams }) {
  const sp = await searchParams;
  const typed = String(sp?.q || "").slice(0, 80).trim();
  const asked = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  // "מושן" typed in the box is the motion craft, as everywhere on the site.
  const named = asked ? "" : craftOfQuery(typed);
  const craft = asked || named;
  const q = named ? "" : typed;
  const role = ROLE_TYPES.some((r) => r.slug === sp?.role) ? sp.role : "";
  const page = Math.max(1, Math.min(50, Number.parseInt(sp?.page, 10) || 1));

  const [{ configured, user, members, error }, hidden] = await Promise.all([
    role || !PROFILES_ENABLED ? { configured: PROFILES_ENABLED, user: null, members: [], error: null } : loadMembers({ q, craft }),
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
  const signup = PROFILES_ENABLED && configured && !role;

  return (
    <div className="wrap">
      <div className="pagehead list">
        <h1>אנשים בתעשייה <span className="cbox">{seeds.length.toLocaleString("he-IL")}</span></h1>
        <p>מי מחליט בחברות: <b>מנהלי שיווק, הפקה וקריאייטיב</b>. מפרסומים פומביים, עם מקור.</p>
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

      {error && <div className="notice err" style={{ marginBlockStart: 32 }}>לא הצלחנו לטעון את חברי הקהילה כרגע. נסו לרענן.</div>}
      {members.length > 0 && (
        <section aria-labelledby="members-h">
          <div className="subhead">
            <h2 id="members-h">חברי הקהילה <span className="count">{members.length}</span></h2>
            <p>פרופילים שבעליהם בנו בעצמם</p>
          </div>
          <div className="grid">{members.map((p) => <PersonCard key={p.slug} p={p} />)}</div>
          {!user && <p className="small muted center" style={{ marginBlockStart: 24 }}>חלק מהפרופילים גלויים רק לחברי קהילה. <a href="/onboard">ההצטרפות</a> לוקחת דקה.</p>}
        </section>
      )}

      <section aria-labelledby="seeds-h">
        <div className="subhead">
          <h2 id="seeds-h">מפרסומים פומביים <span className="count">{seeds.length}</span></h2>
          <p>
            לפי תפקידים שפורסמו באתרי החברות ובעיתונות המקצועית. בלי פרטי קשר. <a href="/privacy#public">איך זה עובד</a>
          </p>
        </div>
        {seeds.length === 0 ? (
          <div className="soon">
            <h3>לא מצאנו אנשים{craft ? ` ב${craftLabel(craft)}` : ""}{q ? <> עבור <bdi>״{q}״</bdi></> : ""}</h3>
            <p>אפשר לנסות מילה אחרת, או לחפש את החברה עצמה.</p>
            <a className="btn" href={`/search?q=${encodeURIComponent(q || craftLabel(craft))}`}>חיפוש בכל האתר</a>
          </div>
        ) : (
          <>
            <div className="pgrid">{shown.map((p) => <SeedCard key={p.id} p={p} claim={PROFILES_ENABLED && configured} />)}</div>
            {shown.length < seeds.length && (
              <div className="pager"><a className="btn" href={href({ page: String(page + 1) })}>עוד אנשים</a></div>
            )}
          </>
        )}
      </section>

      <p className="small muted center" style={{ marginBlockStart: 40 }}>
        {PROFILES_ENABLED && signup && members.length === 0 && !error
          ? <>עוד אין פרופילים אישיים. <a href="/onboard">לבניית הפרופיל הראשון</a> </>
          : null}
        מופיעים כאן? אפשר לבקש הסרה מהתפריט שבכרטיס.
      </p>
    </div>
  );
}
