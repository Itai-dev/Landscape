import FrontPage from "@/components/FrontPage";
import HomePage from "@/components/HomePage";
import { composeFront } from "@/lib/front";
import { CRAFT_SLUGS } from "@/lib/taxonomy";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PROFILES_ENABLED } from "@/lib/config";
import { suggestCompanies } from "@/lib/welcome";
import { nextSendDay, fmtDay } from "@/lib/digestSchedule";

// Home: the industry's news front (components/FrontPage.js). Signed in, it's composed for the reader: their
// crafts (newsletter_prefs.crafts, read with their own session) and the companies they track (org_follows)
// pull matching stories up, and "במעקב שלכם" lists what changed there. Signed out, ?crafts=a,b previews a
// personal front (the links the digest shares use it). Reading the session makes the page dynamic.
export const metadata = { alternates: { canonical: "/" } };
export const dynamic = "force-dynamic";

const parseCrafts = (v) => String(v || "").split(",").map((s) => s.trim()).filter((s) => CRAFT_SLUGS.includes(s)).slice(0, 8);

async function readerOf(sb) {
  const user = await currentUser(sb);
  if (!user) return { signedIn: false, crafts: [], follows: [] };
  const [{ data: prefs }, { data: rows }] = await Promise.all([
    sb.from("newsletter_prefs").select("crafts, frequency").eq("user_id", user.id).maybeSingle(),
    sb.from("org_follows").select("org_id").eq("user_id", user.id),
  ]);
  return { signedIn: true, crafts: Array.isArray(prefs?.crafts) ? prefs.crafts : [], follows: (rows || []).map((r) => r.org_id), frequency: prefs?.frequency || "off" };
}

// The signed-in reader's status line and their one next step (lib/welcome.js picks companies to follow).
const FOLLOW_GOAL = 3;
function memberOf(reader, now) {
  const on = reader.frequency && reader.frequency !== "off";
  const day = on ? nextSendDay(reader.frequency, now) : null;
  const followed = new Set(reader.follows);
  const suggest = reader.crafts.length && reader.follows.length < FOLLOW_GOAL
    ? suggestCompanies(reader.crafts).filter((o) => !followed.has(o.id)).slice(0, 4)
    : [];
  return { newsletter: on, next: day ? `יום ראשון, ${fmtDay(day)}` : "", follows: reader.follows.length, goal: FOLLOW_GOAL, suggest };
}

export default async function Home({ searchParams }) {
  if (PROFILES_ENABLED) return <HomePage split />;
  const sp = await searchParams;
  const sb = await serverClient();
  const reader = sb ? await readerOf(sb).catch(() => ({ signedIn: false, crafts: [], follows: [] })) : { signedIn: false, crafts: [], follows: [] };
  const crafts = reader.signedIn ? reader.crafts : parseCrafts(sp?.crafts);
  const now = new Date();
  const f = composeFront({ crafts, follows: reader.follows, now });
  return <FrontPage f={f} signedIn={reader.signedIn} member={reader.signedIn ? memberOf(reader, now) : null} />;
}
