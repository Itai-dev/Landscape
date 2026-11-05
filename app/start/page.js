import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { composeFront } from "@/lib/front";
import DigestSubscribe from "@/components/DigestSubscribe";
import { CheckIcon } from "@/components/Icons";
import "./start.css";

// The landing page for campaigns (videos, posts): one hook, one email field, nothing else to decide.
// The address is confirmed by email; the link lands on /welcome, where crafts and companies to track are
// chosen, and the reader ends on their personal front. Signed in, there is nothing to start: home.
// Each video links here with its own utm_content, which rides on the sign-up event as `where`.
export const metadata = {
  title: "ההזדמנות הבאה, במייל אחד",
  description: "מכרזים, משרות, ומי מזמין מה בתעשיית הקריאייטיב בישראל. מייל אחד ביום ראשון, לפי התחומים שלכם. חינם.",
  alternates: { canonical: "/start" },
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

const plural = (n, one, many) => (n === 1 ? one : many.replace("%", String(n)));

export default async function Start({ searchParams }) {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (user) redirect("/");
  const sp = await searchParams;
  const hook = String(sp?.utm_content || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const f = composeFront({ now: new Date() });
  const open = f.tenders.filter((t) => t.state === "open");
  const nearest = open[0] || null;

  return (
    <div className="wrap start">
      <section className="start-hero">
        <p className="kicker">תעשיית הקריאייטיב בישראל</p>
        <h1>מפסיקים לחפש את ההזדמנות הבאה במיליון מקומות.</h1>
        <p className="lead">מי מינה מנהל שיווק, מי החליף משרד, איזה מכרז נפתח ומי מגייס. {f.stats.orgs} חברות, כל עדכון עם מקור. מייל אחד ביום ראשון, לפי התחומים שלכם. חינם.</p>
        <div className="start-form card">
          <DigestSubscribe compact id="start" where={hook ? `start-${hook}` : "start"} cta="שלחו לי את המייל של יום ראשון" />
          <p className="small muted">אחרי האישור בוחרים תחומים, והמייל והאתר מותאמים אליהם. בלי סיסמה. אפשר להסיר בכל רגע.</p>
        </div>
      </section>

      <section className="start-proof" aria-label="מה יש בפנים עכשיו">
        <ul>
          <li><b>{plural(f.stats.week, "עדכון אחד נוסף השבוע", "% עדכונים נוספו השבוע")}</b><span>קמפיינים, מינויים, החלפות משרד, עסקאות</span></li>
          <li><b>{open.length ? plural(open.length, "מכרז אחד פתוח להגשה", "% מכרזים פתוחים להגשה") : "מכרזים ציבוריים"}</b><span>{nearest ? `הקרוב: ${nearest.buyer}, ${nearest.label.replace(/^[^·]*· /, "")}` : "מהמקור הרשמי, עם מועדי הגשה"}</span></li>
          <li><b>{plural(f.stats.jobs, "משרה אחת שפורסמה", "% משרות שפורסמו")}</b><span>בחודש האחרון, עם קישור למקור</span></li>
        </ul>
      </section>

      <section className="start-how" aria-labelledby="how-h">
        <h2 id="how-h">איך זה עובד</h2>
        <ol>
          <li><CheckIcon size={18} /><span><b>מזינים מייל.</b> שולחים לכם קישור אישור.</span></li>
          <li><CheckIcon size={18} /><span><b>בוחרים תחומים.</b> מושן, מיתוג, פוסט, קופי, AI, מה שאתם עושים.</span></li>
          <li><CheckIcon size={18} /><span><b>מקבלים רק מה ששייך לכם.</b> באתר כבר עכשיו, ובמייל ביום ראשון.</span></li>
        </ol>
        <p className="small muted">הניוזלטר, החיפוש, המכרזים וההתראות בחינם. אין כרטיס אשראי. את הכתובת לא מוכרים ולא משתפים.</p>
      </section>
    </div>
  );
}
