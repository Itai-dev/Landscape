import { serverClient, currentUser } from "@/lib/supabase/server";
import PersonCard from "@/components/PersonCard";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";

export const metadata = { title: "אנשים" };

export default async function People({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || "").slice(0, 80);
  const craft = CRAFTS.some((c) => c.slug === sp?.craft) ? sp.craft : "";
  const sb = await serverClient();

  if (!sb) {
    return (
      <div className="wrap stack">
        <h1>אנשים בתעשייה</h1>
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

  return (
    <div className="wrap stack">
      <h1>אנשים בתעשייה</h1>
      <form className="row" role="search" action="/people">
        <input type="search" name="q" defaultValue={q} placeholder="שם, תחום, כלי, עיר…" aria-label="חיפוש אנשים" style={{ flex: "3 1 220px" }} />
        <select name="craft" defaultValue={craft} aria-label="תחום" style={{ flex: "1 1 180px" }}>
          <option value="">כל התחומים</option>
          {CRAFTS.map((c) => <option key={c.slug} value={c.slug}>{c.he}</option>)}
        </select>
        <button className="btn primary">חיפוש</button>
      </form>
      {!user && (
        <div className="notice">
          חלק מהפרופילים גלויים רק לחברי קהילה. <a href="/#join">הצטרפות</a> לוקחת דקה.
        </div>
      )}
      {error && <div className="notice err">לא הצלחנו לטעון אנשים כרגע.</div>}
      {people && people.length === 0 && (
        <p className="muted">
          {term || craft ? `לא נמצאו אנשים${craft ? ` ב${craftLabel(craft)}` : ""}${term ? ` עבור "${q}"` : ""}.` : "עוד אין פרופילים. אולי את/ה הראשון/ה?"}{" "}
          <a href="/onboard">בניית פרופיל</a>
        </p>
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
