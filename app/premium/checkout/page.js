import { notFound } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PREMIUM, PLANS, TAX, REFUND_DAYS, isPlan } from "@/lib/premium";
import { planOf } from "@/lib/subscription";
import { billingReady } from "@/lib/billing";
import SignupForm from "@/components/SignupForm";
import CheckoutForm from "./CheckoutForm";
import "../premium.css";

export const metadata = { title: "הצטרפות לפרימיום", alternates: { canonical: "/premium/checkout" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// The payment page: plan, the buyer's details and the consent box, then the provider's hosted card page.
export default async function Checkout({ searchParams }) {
  if (!PREMIUM) notFound();
  const sp = (await searchParams) || {};
  const initial = isPlan(sp.plan) ? sp.plan : "yearly";
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  const plan = user ? await planOf(sb, user.id) : { premium: false };

  return (
    <div className="wrap narrow stack premium">
      <div className="pagehead">
        <h1>הצטרפות לפרימיום</h1>
        <p>בחרו מסלול ומלאו את הפרטים. התשלום עצמו מתבצע בעמוד מאובטח של חברת הסליקה.</p>
      </div>
      {plan.premium ? (
        <div className="card stack">
          <p>הפרימיום כבר פעיל בחשבון שלכם. אפשר לנהל אותו באזור האישי.</p>
          <a className="btn primary" href="/me#plan">לאזור האישי</a>
        </div>
      ) : (
        <CheckoutForm plans={Object.values(PLANS)} initialPlan={initial} ready={billingReady()} signedIn={Boolean(user)} email={user?.email || ""}>
          <p>כדי להצטרף צריך חשבון. היכנסו או הירשמו, ותחזרו לעמוד הזה.</p>
          <SignupForm next={`/premium/checkout?plan=${initial}`} digest={false} />
        </CheckoutForm>
      )}
      <p className="small muted">
        {TAX.note} ביטול בתוך {REFUND_DAYS} יום מההצטרפות מחזיר את כל הסכום.{" "}
        <a href="/terms">תקנון ותנאי שימוש</a> · <a href="/terms#cancel">מדיניות ביטול</a> · <a href="/terms#delivery">מדיניות אספקה</a> · <a href="/privacy">מדיניות פרטיות</a>
      </p>
    </div>
  );
}
