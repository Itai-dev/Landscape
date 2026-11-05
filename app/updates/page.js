import KindTag from "@/components/KindTag";
import Bidi from "@/components/Bidi";
import { listUpdates, BEATS, beatByKey } from "@/lib/front";
import { CRAFTS, CRAFT_SLUGS } from "@/lib/taxonomy";
import { siteUrl } from "@/lib/digest";
import "@/app/front.css";
import "./updates.css";

// The archive of updates, newest first, by section (?beat=) and crafts (?crafts=a,b). Each links to its page.
export const revalidate = 3600;

const parseCrafts = (v) => String(v || "").split(",").map((s) => s.trim()).filter((s) => CRAFT_SLUGS.includes(s)).slice(0, 8);

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const b = beatByKey(sp?.beat);
  const title = b ? `עדכונים: ${b.he}` : "עדכונים";
  return {
    title,
    description: "מה השתנה בתעשיית הקריאייטיב בישראל: קמפיינים וקרדיטים, מינויים, החלפות משרד, עסקאות, השקות ומשרות. כל עדכון עם מקור, תאריך ולמה הוא רלוונטי.",
    alternates: { canonical: b ? `/updates?beat=${b.key}` : "/updates" },
    openGraph: { title: `${title} · CreativeIn`, siteName: "CreativeIn", locale: "he_IL", type: "website", url: `${siteUrl()}/updates`, images: [{ url: "/og/site.png", width: 1200, height: 630 }] },
  };
}

export default async function Updates({ searchParams }) {
  const sp = await searchParams;
  const beat = beatByKey(sp?.beat)?.key || "";
  const crafts = parseCrafts(sp?.crafts);
  const items = listUpdates({ beat, crafts, days: 120 });
  const q = (b, c = crafts) => { const p = []; if (b) p.push(`beat=${b}`); if (c.length) p.push(`crafts=${c.join(",")}`); return `/updates${p.length ? `?${p.join("&")}` : ""}`; };
  const who = crafts.map((c) => CRAFTS.find((x) => x.slug === c)?.he).filter(Boolean).join(", ");

  // Group by the day the update happened.
  const days = [];
  for (const i of items) {
    const last = days[days.length - 1];
    if (last && last.date === i.date) last.items.push(i); else days.push({ date: i.date, day: i.day, items: [i] });
  }

  return (
    <div className="wrap upd-page">
      <div className="pagehead list">
        <h1>עדכונים</h1>
        <p>מה השתנה בתעשייה{who ? <>, בתחומים <b>{who}</b></> : ""}. כל עדכון עם מקור, תאריך ולמה הוא רלוונטי.</p>
      </div>
      <nav className="popular upd-beats" aria-label="לפי נושא">
        <a className={`tag${beat ? "" : " on"}`} href={q("")} aria-current={beat ? undefined : "true"}>הכול</a>
        {BEATS.map((b) => <a key={b.key} className={`tag${beat === b.key ? " on" : ""}`} href={q(b.key)} aria-current={beat === b.key ? "true" : undefined}>{b.he}</a>)}
        {crafts.length > 0 && <a className="tag soft" href={q(beat, [])}>בלי סינון תחומים ×</a>}
      </nav>

      {days.length === 0 ? (
        <p className="muted">אין עדכונים כאלה מהחודשים האחרונים. <a href="/updates">לכל העדכונים</a></p>
      ) : days.map((d) => (
        <section key={d.date} className="upd-day" aria-label={d.day}>
          <h2 className="upd-dayh">{d.day}</h2>
          <ol className="upd-list">
            {d.items.map((i) => (
              <li key={i.id} className="upd-row">
                <p className="upd-meta"><span>{i.class_label}</span>{i.mine && <span className="fp-mark">בתחום שלכם</span>}</p>
                <a className="upd-head" href={i.href} data-track="update_open" data-track-where="updates_list"><Bidi>{i.headline}</Bidi></a>
                {i.org?.name && <p className="upd-org">{i.org.href ? <a href={i.org.href} data-track="company_open" data-track-where="updates_list"><bdi>{i.org.name}</bdi></a> : <bdi>{i.org.name}</bdi>}{i.org.kind && <KindTag kind={i.org.kind} />}</p>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
