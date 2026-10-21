import Bidi from "@/components/Bidi";
import { LinkIcon } from "@/components/Icons";
import { toolsEnabled, toolUpdates } from "@/lib/tools";
import "@/app/tools/tools.css";

// Home strip: the three newest tool updates and a link to /tools. Renders nothing unless the TOOLS flag is on.
export default function ToolsStrip({ max = 3 }) {
  if (!toolsEnabled()) return null;
  const updates = toolUpdates({ days: 60, max });
  if (!updates.length) return null;
  return (
    <section className="wrap section toolsstrip reveal" aria-labelledby="tools-strip-h">
      <div className="sechead">
        <h2 id="tools-strip-h">כלים ו־AI</h2>
        <a className="btn" href="/tools">לכל הכלים</a>
      </div>
      <ol className="ugrid">
        {updates.map((u) => (
          <li key={u.id} className="ucard">
            <p className="umeta"><b lang="en">{u.tool}</b> · {u.day}</p>
            <p className="uhead"><Bidi>{u.headline}</Bidi></p>
            <p className="uwhy">למה זה רלוונטי: <Bidi>{u.why}</Bidi></p>
            <p className="uorg">
              <a className="tap" href={u.source_url} target="_blank" rel="noopener noreferrer" data-track="tool_source_click" data-track-category={u.category} data-track-where="home_tools">
                מקור רשמי <LinkIcon size={14} />
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
