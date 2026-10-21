import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { CRAFTS } from "@/lib/taxonomy";
import { companiesWithCraft } from "@/lib/companies";
import JoinFlow from "./JoinFlow";
import "./join.css";

export const metadata = {
  title: "הרשמה למייל השבועי",
  description: "בוחרים תחום, רואים איך ייראה המייל של יום ראשון, ומשאירים כתובת. חינם, הסרה בלחיצה.",
  alternates: { canonical: "/join" },
};

// Sign-up for the weekly email in three short steps (crafts → preview → address). Signed in, the account
// already has a confirmed address, so the settings page does the same job.
export default async function Join() {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (user) redirect("/digest/settings");
  // Crafts with the most companies first: the first twelve show, the rest open on request.
  const crafts = CRAFTS.map((c) => ({ ...c, n: companiesWithCraft(c.slug) })).sort((a, b) => b.n - a.n);
  return <JoinFlow crafts={crafts} />;
}
