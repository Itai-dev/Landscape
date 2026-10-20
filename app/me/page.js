import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import MeClient from "./MeClient";

export const metadata = { title: "הפרופיל שלי", robots: { index: false } };

export default async function Me() {
  const sb = await serverClient();
  if (!sb) {
    return (
      <div className="wrap narrow stack">
        <h1>הפרופיל שלי</h1>
        <div className="notice">הפרופילים נפתחים בקרוב.</div>
      </div>
    );
  }
  const user = await currentUser(sb);
  if (!user) redirect("/onboard");
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("newsletter_prefs").select("frequency, topics").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/onboard");
  const { visibility, ai_fields, slug, ...rest } = profile;
  return (
    <div className="wrap narrow stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>הפרופיל שלי</h1>
        <a className="btn" href={`/p/${slug}`} style={{ marginInlineStart: "auto" }}>צפייה בפרופיל</a>
      </div>
      <p className="small muted ltr" style={{ textAlign: "end" }}>{user.email}</p>
      <MeClient
        initial={{ profile: rest, visibility, ai_fields, prefs: prefs || { frequency: "off", topics: [] } }}
      />
    </div>
  );
}
