// Newsletter preferences and consent, written only on the server with the service role.
// Consent is recorded with the server's own wording (CONSENT_TEXT), for a confirmed address only, and the
// address itself always comes from the signed-in account (auth.users), never from the browser.
import { CRAFT_SLUGS, TOPIC_SLUGS, CONSENT_TEXT } from "@/lib/taxonomy";
import { FREQUENCIES } from "@/lib/digestSchedule";

export const cleanFrequency = (v) => (FREQUENCIES.includes(v) || v === "off" ? v : null);
export const cleanCraftList = (v) => [...new Set((Array.isArray(v) ? v : String(v || "").split(",")).map((c) => String(c).trim()).filter((c) => CRAFT_SLUGS.includes(c)))].slice(0, 12);
export const cleanTopicList = (v) => [...new Set((Array.isArray(v) ? v : []).filter((t) => TOPIC_SLUGS.includes(t)))];

const confirmed = (user) => Boolean(user?.email && (user.email_confirmed_at || user.confirmed_at));

// Consent stands until the reader unsubscribes. After an unsubscribe (link, one-click or settings), turning
// the digest on again is a new opt-in: it needs `consent: true` again and records a new consent time.
export const activeConsent = (row) => Boolean(row?.consent_at && !row?.unsubscribed_at);

/**
 * saveCrafts(admin, user, crafts) → { ok } — the crafts chosen at sign-up, for someone who didn't ask for the
 * newsletter (they personalise the site; nothing is sent). Never touches frequency or consent.
 */
export async function saveCrafts(admin, user, crafts) {
  if (!admin || !user) return { ok: false };
  const list = cleanCraftList(crafts);
  if (!list.length) return { ok: true };
  const { data: cur } = await admin.from("newsletter_prefs").select("user_id").eq("user_id", user.id).maybeSingle();
  const { error } = cur
    ? await admin.from("newsletter_prefs").update({ crafts: list }).eq("user_id", user.id)
    : await admin.from("newsletter_prefs").insert({ user_id: user.id, email: user.email || "", frequency: "off", crafts: list });
  if (error) console.error("crafts save failed", error.message);
  return { ok: !error };
}

/**
 * savePrefs(admin, user, { frequency, crafts?, topics?, consent }) → { ok, error?, prefs? }
 * Turning the digest on needs explicit consent (`consent: true`) unless consent is already active, and a
 * confirmed address.
 */
export async function savePrefs(admin, user, { frequency, crafts, topics, consent = false }) {
  if (!admin) return { ok: false, error: "not_configured" };
  if (!user) return { ok: false, error: "signed_out" };
  const freq = cleanFrequency(frequency) || "off";
  const { data: cur } = await admin.from("newsletter_prefs").select("consent_at, unsubscribed_at, frequency, crafts, topics").eq("user_id", user.id).maybeSingle();
  const on = freq !== "off";
  if (on && !confirmed(user)) return { ok: false, error: "unconfirmed" };
  const active = activeConsent(cur);
  if (on && !active && consent !== true) return { ok: false, error: "consent_required" };
  const now = new Date().toISOString();
  const row = {
    user_id: user.id,
    email: user.email || "",
    frequency: freq,
    crafts: crafts === undefined ? cur?.crafts || [] : cleanCraftList(crafts),
    topics: topics === undefined ? cur?.topics || [] : cleanTopicList(topics),
    // Turning it off keeps the old consent record and marks when it was withdrawn.
    unsubscribed_at: on ? null : cur?.unsubscribed_at || now,
    // A new opt-in (first time, or after an unsubscribe) is recorded with the wording shown.
    ...(on && !active ? { consent_at: now, consent_text: CONSENT_TEXT } : {}),
  };
  const { error } = await admin.from("newsletter_prefs").upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("newsletter prefs save failed", error.message);
    return { ok: false, error: "save_failed" };
  }
  return { ok: true, prefs: { frequency: row.frequency, crafts: row.crafts, topics: row.topics } };
}
