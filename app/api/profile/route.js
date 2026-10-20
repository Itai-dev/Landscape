import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/guard";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { cleanProfile, cleanPrefs, missingFields, makeSlug } from "@/lib/profile";
import { savePrefs } from "@/lib/consent";
import { seedById } from "@/lib/people";

export const runtime = "nodejs";

const err = (status, error, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const FIELDS = ["name", "headline", "bio", "city", "crafts", "skills", "open_to", "portfolio_url", "links", "experience"];

// Save (create or update) the signed-in person's profile + newsletter preferences.
// Body: multipart with `data` (JSON: {profile, visibility, ai_fields, prefs}) and optional `cv` (PDF to keep privately).
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return err(401, "sign_in");

  const form = await request.formData();
  let data;
  try {
    data = JSON.parse(String(form.get("data") || "{}"));
  } catch {
    return err(400, "bad_json");
  }

  const profile = cleanProfile(data.profile);
  const missing = missingFields(profile);
  if (missing.length) return err(400, "missing", { missing });
  const visibility = ["public", "members", "hidden"].includes(data.visibility) ? data.visibility : "members";
  const ai_fields = (Array.isArray(data.ai_fields) ? data.ai_fields : []).filter((f) => FIELDS.includes(f));

  const { data: existing } = await sb.from("profiles").select("slug, cv_path").eq("user_id", user.id).maybeSingle();
  const row = { user_id: user.id, ...profile, visibility, ai_fields, slug: existing?.slug || makeSlug(profile.name) };
  // "This is me" on a person listed from public sources: that listing is then replaced by this profile.
  if (seedById(data.claimed_from)) row.claimed_from = data.claimed_from;

  // Optional: keep the CV privately (service role; private bucket `cvs`, path <user id>/cv.pdf).
  const cv = form.get("cv");
  if (cv && typeof cv === "object" && cv.size > 0 && cv.size <= 10 * 1024 * 1024) {
    const admin = adminClient();
    if (admin) {
      const bytes = Buffer.from(await cv.arrayBuffer());
      if (bytes.subarray(0, 5).toString() === "%PDF-") {
        await admin.storage.createBucket("cvs", { public: false }).catch(() => {});
        const path = `${user.id}/cv.pdf`;
        const { error } = await admin.storage.from("cvs").upload(path, bytes, { contentType: "application/pdf", upsert: true });
        if (!error) row.cv_path = path;
      }
    }
  }

  const { error } = await sb.from("profiles").upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("profile save failed", error.message);
    return err(500, "save_failed");
  }

  let prefsError = null;
  if (data.prefs) {
    const prefs = cleanPrefs(data.prefs);
    const res = await savePrefs(adminClient(), user, { frequency: prefs.frequency, topics: prefs.topics, consent: data.prefs.consent === true });
    if (!res.ok) prefsError = res.error;
  }

  return NextResponse.json({ ok: true, slug: row.slug, ...(prefsError ? { prefs_error: prefsError } : {}) });
}
