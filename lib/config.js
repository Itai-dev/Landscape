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
// AI_SEARCH=on (server env) switches them on for everyone, once the API key works; AI_SEARCH=premium for
// premium accounts only (needs NEXT_PUBLIC_PREMIUM=on).
export function aiSearchOn() {
  return aiReady() && process.env.AI_SEARCH === "on";
}
export function aiSearchPremium() {
  return aiReady() && process.env.AI_SEARCH === "premium" && PREMIUM;
}
/** May this person get AI answers? (`premium`: they have an active plan) */
export const aiSearchFor = (premium) => aiSearchOn() || (aiSearchPremium() && Boolean(premium));

// Stage 1: information + newsletter only. Profiles, onboarding and claiming a listed card are off
// unless NEXT_PUBLIC_PROFILES=on (one source: lib/chrome.mjs, also read by the companies app build).
export { PROFILES as PROFILES_ENABLED } from "./chrome.mjs";
import { PREMIUM } from "./chrome.mjs";
