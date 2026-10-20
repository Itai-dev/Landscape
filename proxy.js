import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/config";

// Keeps the Supabase session fresh (Server Components can't write cookies).
export async function proxy(request) {
  const cfg = supabaseConfig();
  if (!cfg) return NextResponse.next();
  let response = NextResponse.next({ request });
  const sb = createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|map/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|html)$).*)"],
};
