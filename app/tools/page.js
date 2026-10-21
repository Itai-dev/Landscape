import { notFound } from "next/navigation";
import Bidi from "@/components/Bidi";
import { LinkIcon } from "@/components/Icons";
import { toolsEnabled, toolUpdates, catalogByCategory, toolCount } from "@/lib/tools";
import "./tools.css";

// "כלים ו־AI": what changed in the tools creatives use, from the makers' own changelogs, and a catalog by
// category. Official links only: no affiliate links, no paid placement. Behind the TOOLS flag.
export const revalidate = 3600;

export const metadata = {
  title: "כלים ו־AI",
  description: "מה חדש בכלים שאנשי קריאייטיב עובדים איתם: וידאו ותמונות עם AI, עיצוב, תלת־ממד, עריכה וסאונד. כל עדכון מהמקור הרשמי, עם תאריך.",
  alternates: { canonical: "/tools" },
  openGraph: { title: "כלים ו־AI", description: "מה חדש בכלים של תעשיית הקריאייטיב, מהמקור הרשמי.", locale: "he_IL", type: "website", images: [{ url: "/og/site.png", width: 1200, height: 630 }] },
};

export default function Tools() {
  if (!toolsEnabled()) notFound();
  const updates = toolUpdates({ days: 60 });
  const groups = catalogByCategory();
  return (
    <div className="wrap tools">
      <div className="pagehead list">
        <h1>כלים ו־AI <span className="cbox">{toolCount()}</span></h1>
        <p>מה חדש בכלים שאנשי קריאייטיב עובדים איתם, <b>מהמקור הרשמי ועם תאריך</b>. בלי קישורי שותפים ובלי תוכן ממומן.</p>
      </div>

      {updates.length > 0 && (
        <section className="section tight" aria-labelledby="tools-new">
          <div className="sechead"><h2 id="tools-new">מה חדש <span className="count">{updates.length}</span></h2></div>
          <ol className="ugrid">
            {updates.map((u) => (
              <li key={u.id} className="ucard">
                <p className="umeta"><b lang="en">{u.tool}</b> · {u.day}</p>
                <p className="uhead"><Bidi>{u.headline}</Bidi></p>
                <p className="uwhy">למה זה רלוונטי: <Bidi>{u.why}</Bidi></p>
                <p className="uorg">
                  <a className="tap" href={u.source_url} target="_blank" rel="noopener noreferrer" data-track="tool_source_click" data-track-category={u.category} data-track-where="tools_update">
                    מקור רשמי <LinkIcon size={14} />
                  </a>
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="section tight" aria-labelledby="tools-all">
        <div className="sechead"><h2 id="tools-all">הכלים</h2></div>
        {groups.map((g) => (
          <div key={g.key} className="tgroup">
            <h3>{g.label}</h3>
            <ul className="tcat">
              {g.tools.map((t) => (
                <li key={t.id} className="tool" id={t.id}>
                  <div className="ttop">
                    <b lang="en" dir="ltr">{t.name}</b>
                    <span className="muted small"><bdi>{t.maker}</bdi></span>
                  </div>
                  <p>{t.one_line_he}</p>
                  <div className="ttags">
                    {t.pricing_he && <span className="tag soft">{t.pricing_he}</span>}
                    {t.made_in_israel && <span className="tag il">פותח בישראל</span>}
                  </div>
                  <a className="tap small" href={t.url} target="_blank" rel="noopener" data-track="tool_source_click" data-track-category={t.category} data-track-where="tools_catalog">
                    לאתר הרשמי <LinkIcon size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="muted small tnote">הרשימה נבחרה לפי מה שאנשי קריאייטיב בישראל עובדים איתו. אף כלי לא שילם כדי להופיע כאן, והקישורים הם לאתרים הרשמיים בלבד. חסר כלי? <a href="/feedback">ספרו לנו</a>.</p>
      </section>
    </div>
  );
}
