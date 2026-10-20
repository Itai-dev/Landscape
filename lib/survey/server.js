// Server side of the survey: the person's own response, invite codes, and the published results.
// Results come from a snapshot (survey_snapshots) that is recomputed at most once a day and only after
// enough new responses, so comparing two versions of the page can't reveal one person's answers.
import { randomBytes } from "node:crypto";
import { SURVEY_ID, UNLOCK_REFERRALS, SNAPSHOT_HOURS, SNAPSHOT_MIN_NEW } from "./config.js";
import { aggregate } from "./aggregate.js";

export const CODE_RE = /^[a-z0-9]{8}$/;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const newCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
// An invite counts only for an account created by that sign-in (the magic link is valid for an hour).
const NEW_ACCOUNT_MS = 2 * 60 * 60 * 1000;

export async function myResponse(sb, user) {
  if (!sb || !user) return null;
  const { data } = await sb.from("survey_responses").select("answers, completed, updated_at")
    .eq("user_id", user.id).eq("survey_id", SURVEY_ID).maybeSingle();
  return data || null;
}

// Saves the person's (already cleaned) answers with the service role. A draft never un-completes a
// finished response; `completed_at` keeps the first completion time.
export async function saveResponse(admin, user, { answers, complete }) {
  const { data: existing } = await admin.from("survey_responses").select("completed, completed_at")
    .eq("user_id", user.id).eq("survey_id", SURVEY_ID).maybeSingle();
  if (!complete && existing?.completed) return { ok: true, completed: true, kept: true };
  const now = new Date().toISOString();
  const row = {
    user_id: user.id, survey_id: SURVEY_ID, answers, completed: complete, updated_at: now,
    completed_at: complete ? existing?.completed_at || now : null,
  };
  const { error } = await admin.from("survey_responses").upsert(row, { onConflict: "user_id,survey_id" });
  if (error) {
    console.error("survey save failed", error.message);
    return { ok: false };
  }
  return { ok: true, completed: complete };
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

// How many people who joined through this code had completed the survey when the results snapshot was
// taken. Counting at the snapshot (not live) means the counter can't be used to time someone's answer.
export async function referredRespondents(admin, code, asOf) {
  if (!admin || !code || !asOf) return 0;
  const { data: refs } = await admin.from("referrals").select("referred_user_id").eq("code", code);
  const ids = (refs || []).map((r) => r.referred_user_id);
  if (!ids.length) return 0;
  const { data } = await admin.from("survey_responses").select("user_id, completed_at")
    .eq("survey_id", SURVEY_ID).eq("completed", true).in("user_id", ids);
  return (data || []).filter((r) => r.completed_at && r.completed_at <= asOf).length;
}

const isNewAccount = (user) => Date.now() - Date.parse(user?.created_at || 0) < NEW_ACCOUNT_MS;
const confirmed = (user) => Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at));

// Records that `user` joined through `code`. Counts only for a confirmed, brand-new account (an existing
// account can't be credited later), not your own code, not "+alias" addresses; the first inviter wins.
export async function recordReferral(admin, user, code) {
  if (!admin || !user || !CODE_RE.test(String(code || ""))) return false;
  if (!confirmed(user) || !isNewAccount(user)) return false;
  if (/\+[^@]*@/.test(user.email || "")) return false;
  const { data: owner } = await admin.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  if (!owner || owner.user_id === user.id) return false;
  const { error } = await admin.from("referrals").insert({ code, referred_user_id: user.id, account_created_at: user.created_at });
  return !error;
}

// --- Published results ---------------------------------------------------------------------------------
async function completedAnswers(admin) {
  const answers = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("survey_responses").select("answers")
      .eq("survey_id", SURVEY_ID).eq("completed", true).range(from, from + 999);
    if (error) throw new Error(error.message);
    answers.push(...(data || []).map((r) => r.answers));
    if (!data || data.length < 1000) break;
  }
  return answers;
}

async function completedCount(admin) {
  const { count, error } = await admin.from("survey_responses").select("user_id", { count: "exact", head: true })
    .eq("survey_id", SURVEY_ID).eq("completed", true);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function readSnapshot(admin) {
  if (!admin) return null;
  const { data } = await admin.from("survey_snapshots").select("computed_at, responses, data").eq("survey_id", SURVEY_ID).maybeSingle();
  return data || null;
}

/**
 * refreshSnapshot(admin, { now }) — recomputes the results when there is no snapshot yet, or when the last
 * one is at least SNAPSHOT_HOURS old and at least SNAPSHOT_MIN_NEW responses were completed since.
 * Called by the daily cron and lazily when the results page is opened.
 */
export async function refreshSnapshot(admin, { now = Date.now() } = {}) {
  if (!admin) return { skipped: "not_configured" };
  const snap = await readSnapshot(admin);
  const count = await completedCount(admin);
  if (snap) {
    const age = now - Date.parse(snap.computed_at);
    if (age < SNAPSHOT_HOURS * 3600e3) return { kept: true, reason: "too_soon" };
    if (count - (snap.responses || 0) < SNAPSHOT_MIN_NEW) return { kept: true, reason: "not_enough_new" };
  }
  const data = aggregate(await completedAnswers(admin));
  const row = { survey_id: SURVEY_ID, computed_at: new Date(now).toISOString(), responses: count, data };
  const { error } = await admin.from("survey_snapshots").upsert(row, { onConflict: "survey_id" });
  if (error) throw new Error(error.message);
  return { refreshed: true };
}

// The published results: { at, data } from the snapshot (refreshing it first if it's due).
export async function surveyResults(admin) {
  if (!admin) return null;
  await refreshSnapshot(admin).catch((e) => console.error("survey snapshot refresh failed", e.message));
  const snap = await readSnapshot(admin);
  return snap ? { at: snap.computed_at, data: snap.data } : null;
}

export async function myState(sb, admin, user, asOf = null) {
  const response = await myResponse(sb, user);
  const code = await referralCode(admin, user);
  const at = asOf || (await readSnapshot(admin).catch(() => null))?.computed_at || null;
  const referred = await referredRespondents(admin, code, at);
  const completed = Boolean(response?.completed);
  return { response, completed, code, referred, unlocked: completed || referred >= UNLOCK_REFERRALS };
}
