import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig, serviceKey } from "@/lib/config";

// Per-request client acting as the signed-in user (RLS applies). Null when Supabase isn't configured.
export async function serverClient() {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.js refreshes the session instead.
        }
      },
    },
  });
}

export async function currentUser(sb) {
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

// Service-role client for admin actions (account deletion, CV storage). Server only.
export function adminClient() {
  const cfg = supabaseConfig();
  const key = serviceKey();
  if (!cfg || !key) return null;
  return createClient(cfg.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
