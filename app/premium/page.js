import { notFound } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PREMIUM, PLANS, BENEFITS, FREE_FOLLOWS, REFUND_DAYS, TAX, shekels } from "@/lib/premium";
import { planOf } from "@/lib/subscription";
import { CheckIcon } from "@/components/Icons";
import "./premium.css";

export const metadata = {
  title: "פרימיום",
  description: `מעקב בלי הגבלה, התראות מיידיות, ייצוא רשימות וחיפוש עם AI. ${shekels(PLANS.monthly.price)} לחודש, ביטול בכל רגע.`,
  alternates: { canonical: "/premium" },
};
export const dynamic = "force-dynamic";

const FREE = ["המייל השבועי לפי התחומים שלכם", "כל החברות, האנשים, העדכונים והמכרזים", `מעקב אחרי עד ${FREE_FOLLOWS} חברות`, "התראות במייל, פעם ביום או בשבוע"];
const PAID = ["כל מה שבחינם", "מעקב אחרי כמה חברות שרוצים", "התראות בתוך שעה מהפרסום", "ייצוא חברות ואנשי מפתח ל־CSV", "חיפוש עם AI"];

export default async function Premium() {
  if (!PREMIUM) notFound();
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  const plan = user ? await planOf(sb, user.id) : { premium: false };

  return (
    <div className="wrap stack premium">
      <section className="prhero">
        <p className="kicker">פרימיום</p>
        <h1>כל התעשייה במעקב, ומיד כשמשהו זז.</h1>
        <p className="lead">החינם נשאר חינם. פרימיום מוסיף מעקב בלי הגבלה, התראות בתוך שעה, ייצוא רשימות וחיפוש עם AI.</p>
      </section>

      <section className="prben" aria-label="מה מקבלים">
        {BENEFITS.map((b) => (
          <div key={b.key} className="card">
            <h2>{b.title}</h2>
            <p>{b.text}</p>
          </div>
        ))}
      </section>

      <section className="prbuy" id="buy" aria-labelledby="buy-h">
        <h2 id="buy-h">{plan.premium ? "הפרימיום שלכם פעיל" : "בחרו מסלול"}</h2>
        {plan.premium ? (
          <div className="card stack">
            <p>אפשר לנהל את המנוי, לבטל אותו או להוריד רשימות באזור האישי.</p>
            <a className="btn primary" href="/me#plan">לאזור האישי</a>
          </div>
        ) : (
          <div className="prplans">
            {Object.values(PLANS).map((p) => (
              <a key={p.slug} className="prplan" href={`/premium/checkout?plan=${p.slug}`} data-track="premium_plan">
                <span className="pn">{p.label}{p.note && <span className="pt">{p.note}</span>}</span>
                <span className="pp"><b>{shekels(p.price)}</b> {p.per}</span>
                <span className="btn primary prgo">להצטרפות</span>
              </a>
            ))}
          </div>
        )}
        <p className="small muted">{TAX.note} אפשר לבטל בכל רגע מהאזור האישי, בלחיצה אחת. ביטול בתוך {REFUND_DAYS} יום מההצטרפות מחזיר את כל הסכום. <a href="/terms#cancel">לתנאי הביטול</a></p>
      </section>

      <section className="prcompare" aria-label="חינם מול פרימיום">
        <div className="card stack">
          <h2>חינם</h2>
          <ul className="prlist">{FREE.map((x) => <li key={x}><CheckIcon size={16} /> {x}</li>)}</ul>
        </div>
        <div className="card stack dark">
          <h2>פרימיום <span className="prprice">{shekels(PLANS.monthly.price)} {PLANS.monthly.per}</span></h2>
          <ul className="prlist">{PAID.map((x) => <li key={x}><CheckIcon size={16} /> {x}</li>)}</ul>
        </div>
      </section>

      <section className="card stack prfaq" aria-labelledby="faq-h">
        <h2 id="faq-h">שאלות</h2>
        <details><summary>מה קורה למעקב אם מבטלים?</summary><p>החברות שכבר במעקב נשארות, וההתראות עליהן ממשיכות פעם ביום. חברות חדשות אפשר להוסיף עד {FREE_FOLLOWS}.</p></details>
        <details><summary>איך מבטלים?</summary><p>באזור האישי, בכפתור ״ביטול המנוי״. אין התחייבות ואין דמי ביטול. ביטול בתוך {REFUND_DAYS} יום מההצטרפות מחזיר את כל הסכום. אחר כך, במסלול החודשי הפרימיום פעיל עד סוף החודש ששולם, ובמסלול השנתי מחזירים את החודשים שעוד לא התחילו.</p></details>
        <details><summary>מקבלים קבלה?</summary><p>כן. {TAX.receipt} נשלחת במייל אחרי כל תשלום.</p></details>
        <details><summary>מה ההבדל בין המסלולים?</summary><p>רק אופן החיוב. במסלול השנתי משלמים {shekels(PLANS.yearly.price)} פעם בשנה, כלומר חודשיים מתנה.</p></details>
      </section>
    </div>
  );
}
