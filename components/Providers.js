"use client";
import { createContext, useContext, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

const Ctx = createContext({ supabase: null, configured: false });

export default function Providers({ supabase, children }) {
  const value = useMemo(
    () => ({ supabase: supabase ? createBrowserClient(supabase.url, supabase.key) : null, configured: Boolean(supabase) }),
    [supabase]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSupabase = () => useContext(Ctx);
