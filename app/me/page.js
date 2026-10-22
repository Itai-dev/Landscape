import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import MeClient from "./MeClient";
import ComingSoon from "@/components/ComingSoon";
import AccountClient from "./AccountClient";
import { PROFILES_ENABLED } from "@/lib/config";
import FollowsClient from "./FollowsClient";
import SignupForm from "@/components/SignupForm";
import index from "@/lib/generated/orgs.json";

const ORG_NAMES = new Map(index.orgs.map((o) => [o.id, o.name_he || o.name]));

export const metadata = { title: PROFILES_ENABLED ? "הפרופיל שלי" : "החשבון שלי", robots: { index: false } };

// The person's follows and alert choice, read with their own session (RLS: own rows only).
async function loadFollows(sb, userId) {
  const [{ data: rows }, { data: prefs }] = await Promise.all([
    sb.from("org_follows").select("org_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("newsletter_prefs").select("alerts, alerts_consent_at").eq("user_id", userId).maybeSingle(),
  ]);
  const follows = (rows || []).filter((r) => ORG_NAMES.has(r.org_id)).map((r) => ({ id: r.org_id, name: ORG_NAMES.get(r.org_id), href: `/companies/${encodeURIComponent(r.org_id)}` }));
  return { follows, alerts: prefs?.alerts || "off", consent: Boolean(prefs?.alerts_consent_at), names: Object.fromEntries(ORG_NAMES) };
}

export default async function Me({ searchParams }) {
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
    // Stage 1: an account is only the email behind the digest, the alerts and the survey. No profile to edit.
    if (!user) {
      // Signed out (or on another device): a sign-in link brings people back to their follows and settings.
      return (
        <div className="wrap narrow stack">
          <div className="pagehead"><h1>כניסה</h1><p>נכנסים עם קישור במייל, בלי סיסמה: המעקב שלכם מכל מכשיר, ההתראות והניוזלטר.</p></div>
          <div className="card"><SignupForm next="/me#follows" digest={false} /></div>
          <p className="small muted center">עוד אין לכם חשבון? <a href="/join">להרשמה, בחינם</a></p>
        </div>
      );
    }
    const sp = await searchParams;
    const follows = await loadFollows(sb, user.id);
    return (
      <div className="wrap narrow stack">
        <div className="pagehead"><h1>החשבון שלי</h1><p><bdi className="small">{user.email}</bdi></p></div>
        {sp?.welcome === "1" && <p className="notice ok" role="status"><b>נכנסתם.</b> מכאן מנהלים את המעקב, ההתראות והניוזלטר. מה ששמרתם במעקב בדפדפן הזה נוסף לחשבון.</p>}
        <FollowsClient initial={follows} justFollowed={typeof sp?.followed === "string" ? sp.followed : ""} />
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
