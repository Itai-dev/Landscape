import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import MeClient from "./MeClient";
import ComingSoon from "@/components/ComingSoon";
import AccountClient from "./AccountClient";
import { PROFILES_ENABLED } from "@/lib/config";

export const metadata = { title: PROFILES_ENABLED ? "הפרופיל שלי" : "החשבון שלי", robots: { index: false } };

export default async function Me() {
  const sb = await serverClient();
  if (!sb) {
    return (
      <div className="wrap narrow stack">
        <div className="pagehead"><h1>{PROFILES_ENABLED ? "הפרופיל שלי" : "החשבון שלי"}</h1></div>
        <ComingSoon title={PROFILES_ENABLED ? "הפרופילים נפתחים בקרוב" : "ההרשמה במייל נפתחת בקרוב"} />
      </div>
    );
  }
  const user = await currentUser(sb);
  if (!PROFILES_ENABLED) {
    // Stage 1: an account is only the email behind the digest and the survey. No profile to edit.
    if (!user) redirect("/digest#subscribe");
    return (
      <div className="wrap narrow stack">
        <div className="pagehead"><h1>החשבון שלי</h1><p><bdi className="small">{user.email}</bdi></p></div>
        <AccountClient />
      </div>
    );
  }
  if (!user) redirect("/onboard");
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("newsletter_prefs").select("frequency, topics").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/onboard");
  const { visibility, ai_fields, slug, ...rest } = profile;
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>הפרופיל שלי</h1>
        <p><bdi className="small">{user.email}</bdi></p>
        <div className="row center" style={{ marginBlockStart: 16 }}><a className="btn" href={`/p/${slug}`}>צפייה בפרופיל</a></div>
      </div>
      <MeClient
        initial={{ profile: rest, visibility, ai_fields, prefs: prefs || { frequency: "off", topics: [] } }}
      />
    </div>
  );
}
