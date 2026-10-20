// Module hook for tests: replace "@/lib/supabase/server" with an in-memory stub. Registered after alias-hooks.mjs.
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "stubs");
const STUBS = {
  "@/lib/supabase/server": pathToFileURL(path.join(DIR, "supabase-server.mjs")).href,
  "next/server": pathToFileURL(path.join(DIR, "next-server.mjs")).href,
};

export async function resolve(spec, ctx, next) {
  if (STUBS[spec]) return { url: STUBS[spec], shortCircuit: true };
  return next(spec, ctx);
}
