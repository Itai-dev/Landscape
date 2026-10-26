import { notFound, redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { craftLabel, openToLabel } from "@/lib/taxonomy";
import { initials, coverClass } from "@/components/PersonCard";
import { VerifiedIcon } from "@/components/Icons";
import { PROFILES_ENABLED } from "@/lib/config";

async function load(slug) {
  const sb = await serverClient();
  if (!sb) return { sb: null, p: null };
  const { data } = await sb
    .from("profiles")
    .select("user_id, slug, name, headline, bio, city, crafts, skills, open_to, links, portfolio_url, experience, visibility")
    .eq("slug", slug)
    .maybeSingle();
  return { sb, p: data };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!PROFILES_ENABLED) return { title: "הדף לא נמצא", robots: { index: false } };
  const { p } = await load(slug);
  if (!p) return { title: "פרופיל" };
  return { title: p.name, description: p.headline || undefined, robots: p.visibility === "public" ? undefined : { index: false } };
}

export default async function Profile({ params }) {
  const { slug } = await params;
  if (!PROFILES_ENABLED) redirect("/people"); // old profile links lead to the people directory
  const { sb, p } = await load(slug);
  if (!p) notFound();
  const user = await currentUser(sb);
  const mine = user?.id === p.user_id;

  return (
    <div className="wrap narrow stack">
      {mine && (
        <div className="notice">
          זה הפרופיל שלכם ({p.visibility === "public" ? "ציבורי" : p.visibility === "members" ? "גלוי לחברי קהילה" : "מוסתר"}). <a href="/me">עריכה</a>
        </div>
      )}
      <div className="phead">
        <div className={`avatar lg ${coverClass(p.slug)}`} aria-hidden>{initials(p.name)}</div>
        <h1>{p.name}</h1>
        <span className="badge verified" title="הפרופיל נבנה ואושר על ידי בעליו"><VerifiedIcon size={14} /> פרופיל מאומת</span>
        {p.headline && <div className="muted" style={{ fontSize: 18 }}>{p.headline}</div>}
        {p.city && <div className="small muted">{p.city}</div>}
        <div className="meta">
          {p.crafts.map((c) => <span key={c} className="tag">{craftLabel(c)}</span>)}
          {p.open_to.map((o) => <span key={o} className="tag ok">{openToLabel(o)}</span>)}
        </div>
        {(p.portfolio_url || p.links.length > 0) && (
          <div className="row">
            {p.portfolio_url && <a className="btn primary" href={p.portfolio_url} rel="nofollow ugc noopener" target="_blank">לתיק העבודות</a>}
            {p.links.map((l) => (
              <a key={l.url} className="btn" href={l.url} rel="nofollow ugc noopener" target="_blank">{l.label || new URL(l.url).hostname}</a>
            ))}
          </div>
        )}
      </div>
      <hr className="divider" />

      {p.bio && <div className="card"><h2>קצת עליי</h2><p style={{ whiteSpace: "pre-line", margin: 0 }}>{p.bio}</p></div>}

      {p.experience.length > 0 && (
        <div className="card">
          <h2>ניסיון</h2>
          <ul className="timeline">
            {p.experience.map((x, i) => (
              <li key={i}>
                <b>{x.role || "—"}</b> · {x.org}
                {(x.start || x.end) && <span className="small muted mono"> {[x.start, x.end].filter(Boolean).join("–")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.skills.length > 0 && (
        <div className="card">
          <h2>כלים ומיומנויות</h2>
          <div className="chips">{p.skills.map((s) => <span key={s} className="tag" dir="auto">{s}</span>)}</div>
        </div>
      )}

      <p className="small muted center">יצירת קשר דרך האתר תיפתח בקרוב. אנחנו לא מציגים מיילים וטלפונים.</p>
    </div>
  );
}
