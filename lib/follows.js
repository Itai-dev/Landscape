// Follows and alert choices, written only on the server with the service role. Server only.
// A follow is just "this person wants to hear about this company"; emails about it need the alerts list
// switched on, with consent recorded once in the server's own wording, for a confirmed address only.
import index from "@/lib/generated/orgs.json";
import { ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";
import { PREMIUM, PREMIUM_FOLLOWS, LEGACY_FOLLOWS } from "@/lib/premium";
import { planOf } from "@/lib/subscription";

// The most anyone can follow; each person's own limit comes from their plan (lib/premium.js followLimit:
// 10 free and 500 with premium when premium is on, otherwise 100 for everyone).
export const MAX_FOLLOWS = PREMIUM ? PREMIUM_FOLLOWS : LEGACY_FOLLOWS;
// "instant" (within the hour) is premium only; setAlerts is told whether the person has premium.
export const ALERT_MODE_SLUGS = ["instant", "daily", "weekly", "off"];
const ORG_IDS = new Set(index.orgs.map((o) => o.id));
const ID_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;

export const isOrgId = (id) => typeof id === "string" && ID_RE.test(id) && ORG_IDS.has(id);
export const cleanOrgIds = (list) => [...new Set((Array.isArray(list) ? list : []).filter(isOrgId))].slice(0, MAX_FOLLOWS);
export const cleanMode = (v) => (ALERT_MODE_SLUGS.includes(v) ? v : null);
const confirmed = (user) => Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at));

/** listFollows(db, userId) → [{ org_id, created_at }] newest first. */
export async function listFollows(db, userId) {
  const { data, error } = await db.from("org_follows").select("org_id, created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`follows: ${error.message}`);
  return (data || []).filter((r) => ORG_IDS.has(r.org_id));
}

/** alertPrefs(db, userId) → { alerts, consent } */
export async function alertPrefs(db, userId) {
  const { data } = await db.from("newsletter_prefs").select("alerts, alerts_consent_at").eq("user_id", userId).maybeSingle();
  return { alerts: data?.alerts || "off", consent: Boolean(data?.alerts_consent_at) };
}

/**
 * setAlerts(db, user, { mode, consent }) → { ok, error?, alerts? }
 * Turning alerts on needs a confirmed address and explicit consent once (anti-spam law §30A).
 */
export async function setAlerts(db, user, { mode, consent = false, premium = false }) {
  if (!db) return { ok: false, error: "not_configured" };
  if (!user) return { ok: false, error: "signed_out" };
  const m = cleanMode(mode);
  if (!m) return { ok: false, error: "bad_mode" };
  if (m === "instant" && !premium) return { ok: false, error: "premium_required" };
  const { data: cur } = await db.from("newsletter_prefs").select("user_id, alerts_consent_at").eq("user_id", user.id).maybeSingle();
  const on = m !== "off";
  if (on && !confirmed(user)) return { ok: false, error: "unconfirmed" };
  if (on && !cur?.alerts_consent_at && consent !== true) return { ok: false, error: "consent_required" };
  const now = new Date().toISOString();
  const patch = { alerts: m, ...(on && !cur?.alerts_consent_at ? { alerts_consent_at: now, alerts_consent_text: ALERTS_CONSENT_TEXT } : {}) };
  // Every account has a prefs row (created on sign-up); older accounts may not, so create one switched off.
  const { error } = cur
    ? await db.from("newsletter_prefs").update(patch).eq("user_id", user.id)
    : await db.from("newsletter_prefs").insert({ user_id: user.id, email: user.email || "", frequency: "off", ...patch });
  if (error) {
    console.error("alert prefs save failed", error.message);
    return { ok: false, error: "save_failed" };
  }
  return { ok: true, alerts: m };
}

/** addFollows(db, userId, ids, max?) → { ok, added, limit?, max } — keeps the person's plan limit. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUserId = (v) => typeof v === "string" && UUID_RE.test(v);

export async function addFollows(db, userId, ids, max) {
  // Callers pass user.id; passing the user object once silently broke signed-out follows.
  if (!isUserId(userId)) throw new TypeError("addFollows: userId must be a uuid string");
  const want = cleanOrgIds(ids);
  if (!want.length) return { ok: false, error: "bad_org" };
  const limit = typeof max === "number" ? max : (await planOf(db, userId)).limit;
  const have = new Set((await listFollows(db, userId)).map((r) => r.org_id));
  const fresh = want.filter((id) => !have.has(id));
  // Companies followed before the free tier existed stay; only new ones count against the limit.
  const room = Math.max(0, limit - have.size);
  const rows = fresh.slice(0, room).map((org_id) => ({ user_id: userId, org_id }));
  if (rows.length) {
    const { error } = await db.from("org_follows").upsert(rows, { onConflict: "user_id,org_id", ignoreDuplicates: true });
    if (error) {
      console.error("follow save failed", error.message);
      return { ok: false, error: /follow_limit/.test(error.message) ? "limit" : "save_failed" };
    }
  }
  return { ok: true, added: rows.length, limit: fresh.length > room, max: limit };
}

export async function removeFollow(db, userId, id) {
  if (!isUserId(userId)) throw new TypeError("removeFollow: userId must be a uuid string");
  if (!isOrgId(id)) return { ok: false, error: "bad_org" };
  const { error } = await db.from("org_follows").delete().eq("user_id", userId).eq("org_id", id);
  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}
