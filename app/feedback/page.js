import { adminClient } from "@/lib/supabase/server";
import FeedbackForm from "./FeedbackForm";

export const metadata = { title: "משהו חסר?", robots: { index: false }, alternates: { canonical: "/feedback" } };
export const dynamic = "force-dynamic";

// A short note to us: what is missing, what to improve. No account, the email is optional.
export default async function Feedback({ searchParams }) {
  const sp = await searchParams;
  const from = typeof sp?.from === "string" ? sp.from.replace(/[^a-z0-9_-]/gi, "").slice(0, 30) : "";
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>משהו חסר? יש רעיון לשיפור?</h1>
        <p>זו גרסת בטא. כל הערה נקראת: מה חסר לכם, מה לא עובד, מה הייתם רוצים לראות.</p>
      </div>
      <FeedbackForm ready={Boolean(adminClient())} from={from} />
    </div>
  );
}
