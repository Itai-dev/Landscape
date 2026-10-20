// Follows and alert choices, written only on the server with the service role. Server only.
// A follow is just "this person wants to hear about this company"; emails about it need the alerts list
// switched on, with consent recorded once in the server's own wording, for a confirmed address only.
import index from "@/lib/generated/orgs.json";
import { ALERTS_CONSENT_TEXT } from "@/lib/taxonomy";

export const MAX_FOLLOWS = 100;
export const ALERT_MODE_SLUGS = ["daily", "weekly", "off"];
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
export async function setAlerts(db, user, { mode, consent = false }) {
  if (!db) return { ok: false, error: "not_configured" };
  if (!user) return { ok: false, error: "signed_out" };
  const m = cleanMode(mode);
  if (!m) return { ok: false, error: "bad_mode" };
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

/** addFollows(db, userId, ids) → { ok, added, limit? } — keeps the 100 cap. */
export async function addFollows(db, userId, ids) {
  const want = cleanOrgIds(ids);
  if (!want.length) return { ok: false, error: "bad_org" };
  const have = new Set((await listFollows(db, userId)).map((r) => r.org_id));
  const fresh = want.filter((id) => !have.has(id));
  const room = Math.max(0, MAX_FOLLOWS - have.size);
  const rows = fresh.slice(0, room).map((org_id) => ({ user_id: userId, org_id }));
  if (rows.length) {
    const { error } = await db.from("org_follows").upsert(rows, { onConflict: "user_id,org_id", ignoreDuplicates: true });
    if (error) {
      console.error("follow save failed", error.message);
      return { ok: false, error: /follow_limit/.test(error.message) ? "limit" : "save_failed" };
    }
  }
  return { ok: true, added: rows.length, limit: fresh.length > room };
}

export async function removeFollow(db, userId, id) {
  if (!isOrgId(id)) return { ok: false, error: "bad_org" };
  const { error } = await db.from("org_follows").delete().eq("user_id", userId).eq("org_id", id);
  if (error) return { ok: false, error: "save_failed" };
  return { ok: true };
}
