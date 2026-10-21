// Environment, read on the server. Names cover the Vercel ⇄ Supabase integration (old and new key names).
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || null;
}

export function aiReady() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// AI answers in search (/search and the companies app's "Ask AI" tab) are off for the launch.
// AI_SEARCH=on (server env) switches them on, once the API key works.
export function aiSearchOn() {
  return aiReady() && process.env.AI_SEARCH === "on";
}

// Stage 1: information + newsletter only. Profiles, onboarding and claiming a listed card are off
// unless NEXT_PUBLIC_PROFILES=on (one source: lib/chrome.mjs, also read by the companies app build).
export { PROFILES as PROFILES_ENABLED } from "./chrome.mjs";
