import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { CRAFTS } from "@/lib/taxonomy";
import { companiesWithCraft } from "@/lib/companies";
import JoinFlow from "../join/JoinFlow";
import "../join/join.css";

// The campaign link (videos, posts): straight into the sign-up questionnaire, no landing copy; the video does
// the selling. The same three steps as /join (crafts → newsletter → address), ending on /welcome. Each video
// links here with its own utm_content, which rides on the sign-up events as `where`. Signed in: home.
export const metadata = {
  title: "הרשמה",
  description: "מכרזים, משרות, ומי מזמין מה בתעשיית הקריאייטיב בישראל. מייל אחד ביום ראשון, לפי התחומים שלכם. חינם.",
  alternates: { canonical: "/start" },
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

export default async function Start({ searchParams }) {
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (user) redirect("/");
  const sp = await searchParams;
  const hook = String(sp?.utm_content || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const crafts = CRAFTS.map((c) => ({ ...c, n: companiesWithCraft(c.slug) }));
  return <JoinFlow crafts={crafts} source={hook ? `start-${hook}` : "start"} />;
}
