import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { CRAFTS } from "@/lib/taxonomy";
import { companiesWithCraft } from "@/lib/companies";
import JoinFlow from "./JoinFlow";
import "./join.css";

export const metadata = {
  title: "הרשמה",
  description: "חשבון חינם: מעקב אחרי חברות מכל מכשיר, התראות, ואם רוצים, ניוזלטר שבועי לפי התחום שלכם.",
  alternates: { canonical: "/join" },
};

// Sign-up in three short steps (crafts → newsletter yes / not now → address). Signed in, there is
// nothing to sign up for: the personal area (/me) has the same choices.
export default async function Join() {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (user) redirect("/me");
  // Crafts in the taxonomy's order (creative and art direction, strategy, copy and AI first; schema/taxonomy.json
  // → facets.craft): the first twelve show, the rest open on request.
  const crafts = CRAFTS.map((c) => ({ ...c, n: companiesWithCraft(c.slug) }));
  return <JoinFlow crafts={crafts} />;
}
