import { serverClient, currentUser } from "@/lib/supabase/server";
import PersonCard from "@/components/PersonCard";
import { SearchIcon } from "@/components/Icons";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";

export const metadata = { title: "אנשים" };

const POPULAR = ["motion-design", "animation-3d", "branding", "vfx", "editing", "sound-design", "illustration", "digital-design", "ai-creative"];

function Intro() {
  return (
    <>
      <div className="crumbs"><a href="/">דף הבית</a> / <b>אנשים</b></div>
      <h1 style={{ marginBlockEnd: 8 }}>אנשים בתעשייה</h1>
      <p className="muted" style={{ maxWidth: "60ch" }}>מושן, אנימציה, פוסט, מיתוג, סאונד ועוד. מחפשים לפי שם, תחום, כלי או עיר.</p>
    </>
  );
}

export default async function People({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || "").slice(0, 80);
  const craft = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  const sb = await serverClient();

  if (!sb) {
    return (
      <div className="wrap stack">
        <Intro />
        <div className="notice">ספריית האנשים נפתחת בקרוב, יחד עם ההרשמה. בינתיים: <a href="/map/app.html">המפה</a>.</div>
      </div>
    );
  }

  const user = await currentUser(sb);
  let query = sb
    .from("profiles")
    .select("slug, name, headline, city, crafts, open_to")
    .neq("visibility", "hidden")
    .order("updated_at", { ascending: false })
    .limit(60);
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[%,()*\\:."']/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,headline.ilike.%${term}%,bio.ilike.%${term}%,city.ilike.%${term}%`);
  if (craft) query = query.contains("crafts", [craft]);
  const { data: people, error } = await query;
  const craftHref = (c) => `/people?${new URLSearchParams({ ...(q ? { q } : {}), ...(c ? { craft: c } : {}) })}`;

  return (
    <div className="wrap stack">
      <Intro />
      <div className="popular" style={{ marginBlockStart: 0 }}>
        <b>פופולרי:</b>
        <a className={`tag${craft ? "" : " on"}`} href={craftHref("")}>הכול</a>
        {POPULAR.map((c) => <a key={c} className={`tag${craft === c ? " on" : ""}`} href={craftHref(c)}>{craftLabel(c)}</a>)}
      </div>
      <form className="filters" role="search" action="/people">
        <div className="psearch">
          <input type="search" name="q" defaultValue={q} placeholder="שם, תחום, כלי, עיר…" aria-label="חיפוש אנשים" />
          <button className="go" aria-label="חיפוש"><SearchIcon /></button>
        </div>
        <select name="craft" defaultValue={craft} aria-label="תחום">
          <option value="">כל התחומים</option>
          {CRAFTS.map((c) => <option key={c.slug} value={c.slug}>{c.he}</option>)}
        </select>
      </form>
      <hr className="divider" />
      {!user && (
        <div className="notice">
          חלק מהפרופילים גלויים רק לחברי קהילה. <a href="/#join">הצטרפות</a> לוקחת דקה.
        </div>
      )}
      {error && <div className="notice err">לא הצלחנו לטעון אנשים כרגע.</div>}
      {people && people.length === 0 && (
        <div className="panel" style={{ textAlign: "center" }}>
          <h3>{term || craft ? `לא נמצאו אנשים${craft ? ` ב${craftLabel(craft)}` : ""}${term ? ` עבור "${q}"` : ""}` : "עוד אין פרופילים. אולי את/ה הראשון/ה?"}</h3>
          <a className="btn primary" href="/onboard">בניית פרופיל</a>
        </div>
      )}
      {people && people.length > 0 && (
        <>
          <p className="small muted">{people.length} אנשים</p>
          <div className="grid">{people.map((p) => <PersonCard key={p.slug} p={p} />)}</div>
        </>
      )}
    </div>
  );
}
