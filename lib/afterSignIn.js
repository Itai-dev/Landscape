// What a sign-up form asked for, applied once the address is confirmed. Shared by the magic-link landing
// (/auth/callback) and the Google sign-in on the page (/api/auth/after). Server only.
//   subscribe=weekly|biweekly|monthly&crafts=a,b  — the digest opt-in ticked on the form (double opt-in)
//   crafts=a,b (no subscribe)                     — an account without the newsletter: the crafts only
//   ref=CODE                                      — an invite link, credited only to a brand-new account
//   follow=ORG_ID&alerts=daily                    — a company followed signed out, with the alerts opt-in
import { savePrefs, saveCrafts, cleanFrequency, cleanCraftList } from "@/lib/consent";
import { recordReferral, CODE_RE } from "@/lib/survey/server";
import { isOrgId, addFollows, alertPrefs, setAlerts } from "@/lib/follows";

export async function applySignupChoices(admin, user, params) {
  if (!user || !admin) return;
  const subscribe = cleanFrequency(params.get("subscribe"));
  if (subscribe && subscribe !== "off") {
    await savePrefs(admin, user, { frequency: subscribe, crafts: cleanCraftList(params.get("crafts")), consent: true }).catch((e) => console.error("subscribe on confirm failed", e?.message));
  } else if (params.get("crafts")) {
    // An account without the newsletter: keep the crafts chosen at sign-up (nothing is sent).
    await saveCrafts(admin, user, params.get("crafts")).catch((e) => console.error("crafts on confirm failed", e?.message));
  }
  // A follow started signed out (/api/follows/start): record it, and the alerts opt-in ticked with it.
  const follow = params.get("follow");
  if (isOrgId(follow)) {
    await addFollows(admin, user.id, [follow]).catch((e) => console.error("follow on confirm failed", e?.message));
    if (params.get("alerts") === "daily") {
      const cur = await alertPrefs(admin, user.id).catch(() => null);
      // Someone who switched alerts off earlier keeps them off; following again doesn't override that.
      if (cur && !cur.consent) await setAlerts(admin, user, { mode: "daily", consent: true }).catch((e) => console.error("alerts on confirm failed", e?.message));
    }
  }
  const ref = String(params.get("ref") || "").toLowerCase();
  if (CODE_RE.test(ref)) await recordReferral(admin, user, ref).catch(() => {});
}

// A same-site path to continue to, or the fallback.
export function safeNext(value, fallback) {
  const v = String(value || "");
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
