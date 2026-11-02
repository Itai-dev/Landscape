import { notFound } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PREMIUM } from "@/lib/premium";
import { planOf } from "@/lib/subscription";

export const metadata = { title: "פרימיום", robots: { index: false } };
export const dynamic = "force-dynamic";

// Where the payment page sends people back. The plan is switched on by the provider's webhook, which can
// arrive a few seconds after the person does.
export default async function Thanks() {
  if (!PREMIUM) notFound();
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  const plan = user ? await planOf(sb, user.id) : { premium: false };
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>{plan.premium ? "הפרימיום פעיל" : "קיבלנו את הבקשה"}</h1>
        <p>{plan.premium
          ? "מעכשיו אפשר לעקוב אחרי כמה חברות שרוצים, לבחור התראות מיידיות ולהוריד רשימות. שלחנו לכם מייל עם פרטי המנוי, והקבלה בדרך."
          : "אישור התשלום מגיע אלינו בדרך כלל תוך דקה. רעננו את העמוד בעוד רגע. אם הפרימיום לא נפתח, כתבו לנו."}</p>
      </div>
      <div className="row center">
        <a className="btn primary" href="/me#plan">לאזור האישי</a>
        <a className="btn" href="/companies">לחברות</a>
      </div>
    </div>
  );
}
