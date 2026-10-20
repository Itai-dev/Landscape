"use client";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/Providers";

// undefined = still loading, null = signed out.
export function useUser() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState(supabase ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  return user;
}
