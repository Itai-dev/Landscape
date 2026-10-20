import { notFound } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { craftLabel, openToLabel } from "@/lib/taxonomy";
import { initials } from "@/components/PersonCard";

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
  const { p } = await load(slug);
  if (!p) return { title: "פרופיל" };
  return { title: p.name, description: p.headline || undefined, robots: p.visibility === "public" ? undefined : { index: false } };
}

export default async function Profile({ params }) {
  const { slug } = await params;
  const { sb, p } = await load(slug);
  if (!p) notFound();
  const user = await currentUser(sb);
  const mine = user?.id === p.user_id;

  return (
    <div className="wrap narrow stack">
      {mine && (
        <div className="notice">
          זה הפרופיל שלך ({p.visibility === "public" ? "ציבורי" : p.visibility === "members" ? "גלוי לחברי קהילה" : "מוסתר"}). <a href="/me">עריכה</a>
        </div>
      )}
      <div className="card">
        <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <div className="avatar" aria-hidden style={{ width: 72, height: 72, fontSize: 28 }}>{initials(p.name)}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ marginBlockEnd: 4 }}>{p.name}</h1>
            {p.headline && <div className="muted">{p.headline}</div>}
            {p.city && <div className="small muted">{p.city}</div>}
          </div>
        </div>
        <div className="meta">
          {p.crafts.map((c) => <span key={c} className="tag">{craftLabel(c)}</span>)}
        </div>
        {p.open_to.length > 0 && (
          <p className="small" style={{ marginBlock: "14px 0" }}>
            <b>פתוח/ה ל: </b>{p.open_to.map(openToLabel).join(" · ")}
          </p>
        )}
      </div>

      {p.bio && <div className="card"><p style={{ whiteSpace: "pre-line", margin: 0 }}>{p.bio}</p></div>}

      {(p.portfolio_url || p.links.length > 0) && (
        <div className="card">
          <h2>עבודות וקישורים</h2>
          <div className="row">
            {p.portfolio_url && <a className="btn primary" href={p.portfolio_url} rel="nofollow ugc noopener" target="_blank">פורטפוליו</a>}
            {p.links.map((l) => (
              <a key={l.url} className="btn" href={l.url} rel="nofollow ugc noopener" target="_blank">{l.label || new URL(l.url).hostname}</a>
            ))}
          </div>
        </div>
      )}

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

      <p className="small muted">יצירת קשר דרך הפלטפורמה תיפתח בקרוב. אנחנו לא מציגים מיילים וטלפונים.</p>
    </div>
  );
}
