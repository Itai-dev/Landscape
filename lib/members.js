// Registered members (Supabase) and the seed ids that should stay out of the public list:
// claimed by a member, or with a pending removal request. Server only.
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";

const clean = (q) => q.replace(/[%,()*\\:."']/g, " ").trim(); // characters with meaning in PostgREST filters

export async function loadMembers({ q = "", craft = "", limit = 60 } = {}) {
  const sb = await serverClient();
  if (!sb) return { configured: false, user: null, members: [], error: null };
  const user = await currentUser(sb);
  let query = sb
    .from("profiles")
    .select("slug, name, headline, city, crafts, open_to")
    .neq("visibility", "hidden")
    .order("updated_at", { ascending: false })
    .limit(limit);
  const term = clean(q);
  if (term) query = query.or(`name.ilike.%${term}%,headline.ilike.%${term}%,bio.ilike.%${term}%,city.ilike.%${term}%`);
  if (craft) query = query.contains("crafts", [craft]);
  const { data, error } = await query;
  return { configured: true, user, members: data || [], error };
}

export async function hiddenSeeds() {
  const admin = adminClient();
  if (!admin) return new Set();
  const [claimed, removed] = await Promise.all([
    admin.from("profiles").select("claimed_from").not("claimed_from", "is", null),
    admin.from("removal_requests").select("seed_id"),
  ]);
  return new Set([...(claimed.data || []).map((r) => r.claimed_from), ...(removed.data || []).map((r) => r.seed_id)]);
}
