import { notFound } from "next/navigation";
import { mcpOn } from "@/lib/config";
import { siteUrl } from "@/lib/digest";
import CopyField from "./CopyField";
import "./connect.css";

// How to add CreativeIn to an AI assistant (the connector at /api/mcp, lib/mcp.js). A trial: the page exists
// only while the connector is on, and stays out of search engines.
export const metadata = { title: "CreativeIn בתוך Claude ו־ChatGPT", robots: { index: false }, alternates: { canonical: "/connect" } };
export const dynamic = "force-dynamic";

const ASK = [
  "מי מזמין מושן דיזיין בתל אביב?",
  "אילו מכרזים פתוחים עכשיו למיתוג?",
  "מה חדש אצל Wix בחודש האחרון?",
  "אילו משרות קריאייטיב פורסמו השבוע?",
];

export default function Connect() {
  if (!mcpOn()) notFound();
  const url = `${siteUrl()}/api/mcp`;
  return (
    <div className="wrap narrow stack cn">
      <div className="pagehead">
        <p className="cn-k">ניסוי</p>
        <h1>CreativeIn בתוך Claude ו־ChatGPT</h1>
        <p>מחברים פעם אחת, ושואלים את העוזר שלכם על התעשייה: חברות, עדכונים, משרות ומכרזים. התשובות מגיעות מהמידע שבאתר, עם קישור למקור.</p>
      </div>

      <section className="card stack" aria-labelledby="cn-url">
        <h2 id="cn-url">הכתובת של המחבר</h2>
        <CopyField value={url} label="כתובת המחבר" />
        <p className="muted small">בחינם, בלי הרשמה ובלי סיסמה. המחבר רק קורא מידע ציבורי מהאתר. מהשיחה שלכם מגיעות אליו רק מילות החיפוש, והוא לא שומר אותן.</p>
      </section>

      <section className="card stack" aria-labelledby="cn-claude">
        <h2 id="cn-claude">ב־Claude</h2>
        <ol className="cn-steps">
          <li>פתחו את <b className="ltr">Customize</b> ובחרו <b className="ltr">Connectors</b>.</li>
          <li>לחצו על <b className="ltr">+ Add</b> ואז על <b className="ltr">Add custom connector</b>.</li>
          <li>תנו שם (למשל CreativeIn), הדביקו את הכתובת ואשרו.</li>
        </ol>
      </section>

      <section className="card stack" aria-labelledby="cn-gpt">
        <h2 id="cn-gpt">ב־ChatGPT</h2>
        <ol className="cn-steps">
          <li>פתחו את <b className="ltr">Plugins</b> ולחצו על הפלוס.</li>
          <li>בחרו <b className="ltr">Add custom MCP server</b>, תנו שם והדביקו את הכתובת.</li>
          <li>באימות בחרו <b className="ltr">No authentication</b>, ואשרו.</li>
        </ol>
        <p className="muted small">נכון להיום ChatGPT מאפשר להוסיף מחבר כזה רק בחשבונות עסקיים (Business, Enterprise ו־Edu).</p>
      </section>

      <section className="card stack" aria-labelledby="cn-ask">
        <h2 id="cn-ask">מה אפשר לשאול</h2>
        <ul className="cn-ask">{ASK.map((q) => <li key={q}>{q}</li>)}</ul>
        <p className="muted small">שמות התפריטים אצל Claude ו־ChatGPT משתנים מדי פעם. לא מצאתם? <a href="/feedback?from=connect">כתבו לנו</a> ונעזור.</p>
      </section>
    </div>
  );
}
