import FrontPage from "@/components/FrontPage";
import HomePage from "@/components/HomePage";
import { composeFront } from "@/lib/front";
import { CRAFT_SLUGS } from "@/lib/taxonomy";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { PROFILES_ENABLED } from "@/lib/config";

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
    sb.from("newsletter_prefs").select("crafts").eq("user_id", user.id).maybeSingle(),
    sb.from("org_follows").select("org_id").eq("user_id", user.id),
  ]);
  return { signedIn: true, crafts: Array.isArray(prefs?.crafts) ? prefs.crafts : [], follows: (rows || []).map((r) => r.org_id) };
}

export default async function Home({ searchParams }) {
  if (PROFILES_ENABLED) return <HomePage split />;
  const sp = await searchParams;
  const sb = await serverClient();
  const reader = sb ? await readerOf(sb).catch(() => ({ signedIn: false, crafts: [], follows: [] })) : { signedIn: false, crafts: [], follows: [] };
  const crafts = reader.signedIn ? reader.crafts : parseCrafts(sp?.crafts);
  const f = composeFront({ crafts, follows: reader.follows, now: new Date() });
  return <FrontPage f={f} signedIn={reader.signedIn} />;
}
