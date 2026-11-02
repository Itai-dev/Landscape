import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "סיסמה", robots: { index: false } };
export const dynamic = "force-dynamic";

// Set or change the account's password: after "forgot password" (the reset link signs the person in and lands
// here with ?reset=1), or from the account page, for people who signed up with Google or a sign-in link.
export default async function PasswordPage({ searchParams }) {
  const sp = await searchParams;
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (!user) redirect("/me");
  const reset = sp?.reset === "1";
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>{reset ? "בחרו סיסמה חדשה" : "סיסמה"}</h1>
        <p>{reset ? "ותיכנסו איתה מכל מכשיר." : "הגדירו סיסמה ותיכנסו עם המייל והסיסמה מכל מכשיר, בלי לחכות לקישור."} <bdi className="small">{user.email}</bdi></p>
      </div>
      <div className="card"><PasswordForm /></div>
    </div>
  );
}
