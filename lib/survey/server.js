// Server side of the survey: the person's own response, invite codes, and the aggregate.
// Aggregates read every completed response with the service role and return only counts and percentiles.
import { randomBytes } from "node:crypto";
import { SURVEY_ID, UNLOCK_REFERRALS } from "./config.js";
import { aggregate } from "./aggregate.js";

export const CODE_RE = /^[a-z0-9]{8}$/;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const newCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function myResponse(sb, user) {
  if (!sb || !user) return null;
  const { data } = await sb.from("survey_responses").select("answers, completed, updated_at")
    .eq("user_id", user.id).eq("survey_id", SURVEY_ID).maybeSingle();
  return data || null;
}

// The person's invite code, created on first use.
export async function referralCode(admin, user) {
  if (!admin || !user) return null;
  const { data } = await admin.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle();
  if (data?.code) return data.code;
  for (let i = 0; i < 3; i++) {
    const code = newCode();
    const { error } = await admin.from("referral_codes").insert({ user_id: user.id, code });
    if (!error) return code;
    const again = await admin.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle();
    if (again.data?.code) return again.data.code;
  }
  return null;
}

// How many people who joined through this code have completed the survey.
export async function referredRespondents(admin, code) {
  if (!admin || !code) return 0;
  const { data: refs } = await admin.from("referrals").select("referred_user_id").eq("code", code);
  const ids = (refs || []).map((r) => r.referred_user_id);
  if (!ids.length) return 0;
  const { count } = await admin.from("survey_responses").select("user_id", { count: "exact", head: true })
    .eq("survey_id", SURVEY_ID).eq("completed", true).in("user_id", ids);
  return count || 0;
}

// Records that `user` joined through `code` (first inviter wins; your own code doesn't count).
export async function recordReferral(admin, user, code) {
  if (!admin || !user || !CODE_RE.test(String(code || ""))) return false;
  const { data: owner } = await admin.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  if (!owner || owner.user_id === user.id) return false;
  const { error } = await admin.from("referrals").insert({ code, referred_user_id: user.id });
  return !error;
}

export async function myState(sb, admin, user) {
  const response = await myResponse(sb, user);
  const code = await referralCode(admin, user);
  const referred = await referredRespondents(admin, code);
  const completed = Boolean(response?.completed);
  return { response, completed, code, referred, unlocked: completed || referred >= UNLOCK_REFERRALS };
}

// Aggregate of all completed responses, kept for a few minutes per server instance.
let cache = { at: 0, value: null };
export function clearAggregateCache() { cache = { at: 0, value: null }; }

export async function surveyAggregate(admin) {
  if (!admin) return null;
  if (cache.value && Date.now() - cache.at < 5 * 60_000) return cache.value;
  const answers = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("survey_responses").select("answers")
      .eq("survey_id", SURVEY_ID).eq("completed", true).range(from, from + 999);
    if (error) return cache.value;
    answers.push(...(data || []).map((r) => r.answers));
    if (!data || data.length < 1000) break;
  }
  cache = { at: Date.now(), value: aggregate(answers) };
  return cache.value;
}
