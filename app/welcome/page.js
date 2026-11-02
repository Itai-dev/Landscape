import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { CRAFTS, craftLabel } from "@/lib/taxonomy";
import { activeConsent } from "@/lib/consent";
import { firstSendLabel } from "@/lib/digestSchedule";
import { STATS } from "@/lib/companies";
import { listTenders } from "@/lib/tenders";
import { suggestCompanies } from "@/lib/welcome";
import WelcomeFlow from "./WelcomeFlow";
import "@/app/join/join.css";
import "./welcome.css";

export const metadata = { title: "ברוכים הבאים", robots: { index: false } };
export const dynamic = "force-dynamic";

// Right after sign-up (the magic link or Google lands here): a success screen that says what was set up and what
// the site does, then one or two onboarding screens (crafts, if none were chosen yet; companies to follow).
// On preview deploys only (never production), /welcome?demo=1 shows the screens with sample data and no sign-in,
// so the flow can be checked before merging (&crafts=a,b picks the crafts; &crafts= with nothing shows the craft step).
const DEMO_OK = process.env.VERCEL_ENV !== "production";

export default async function Welcome({ searchParams }) {
  const sp = await searchParams;
  const sb = await serverClient();
  const user = sb ? await currentUser(sb).catch(() => null) : null;
  if (!user && DEMO_OK && sp?.demo === "1") {
    const crafts = (sp.crafts === undefined ? "creative-direction,art-direction" : String(sp.crafts)).split(",").filter((c) => CRAFTS.some((x) => x.slug === c));
    return (
      <WelcomeFlow demo email="name@example.com" crafts={crafts.map((slug) => ({ slug, he: craftLabel(slug) }))} allCrafts={CRAFTS}
        newsletter={{ first: firstSendLabel("weekly") }} alertsConsent={false} following={0}
        stats={{ orgs: STATS.orgs, tenders: listTenders().filter((t) => t.state === "open").length }}
        suggestions={crafts.length ? suggestCompanies(crafts) : []} />
    );
  }
  if (!user) redirect("/me");
  const [{ data: prefs }, { count: following }] = await Promise.all([
    sb.from("newsletter_prefs").select("frequency, crafts, consent_at, unsubscribed_at, alerts_consent_at").eq("user_id", user.id).maybeSingle(),
    sb.from("org_follows").select("org_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const crafts = (prefs?.crafts || []).filter((c) => CRAFTS.some((x) => x.slug === c));
  const newsletter = Boolean(prefs && prefs.frequency && prefs.frequency !== "off" && activeConsent(prefs));
  const openTenders = listTenders().filter((t) => t.state === "open").length;
  return (
    <WelcomeFlow
      email={user.email || ""}
      crafts={crafts.map((slug) => ({ slug, he: craftLabel(slug) }))}
      allCrafts={CRAFTS}
      newsletter={newsletter ? { first: firstSendLabel(prefs.frequency) } : null}
      alertsConsent={Boolean(prefs?.alerts_consent_at)}
      following={following || 0}
      stats={{ orgs: STATS.orgs, tenders: openTenders }}
      suggestions={crafts.length ? suggestCompanies(crafts) : []}
    />
  );
}
