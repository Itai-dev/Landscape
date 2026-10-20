import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { listFollows, alertPrefs, addFollows, removeFollow, setAlerts, isOrgId, cleanOrgIds, MAX_FOLLOWS } from "@/lib/follows";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });
const NO_STORE = { headers: { "cache-control": "private, no-store" } };

// GET: the signed-in person's follows and alert choice (read with their own session, RLS: own rows only).
// Signed out, it only says whether sign-up is available, so pages know which button to show.
export async function GET() {
  const sb = await serverClient();
  if (!sb) return NextResponse.json({ signup: false, signedIn: false, follows: [] }, NO_STORE);
  const user = await currentUser(sb).catch(() => null);
  if (!user) return NextResponse.json({ signup: true, signedIn: false, follows: [] }, NO_STORE);
  const db = adminClient();
  if (!db) return NextResponse.json({ signup: true, signedIn: true, follows: [], alerts: "off", consent: false }, NO_STORE);
  const [follows, prefs] = await Promise.all([listFollows(db, user.id).catch(() => []), alertPrefs(db, user.id)]);
  return NextResponse.json({ signup: true, signedIn: true, follows: follows.map((f) => f.org_id), alerts: prefs.alerts, consent: prefs.consent, max: MAX_FOLLOWS }, NO_STORE);
}

// POST, signed in, written by the server (service role):
//   { org_id, on: true|false, consent? }  follow or unfollow one company (consent turns alerts on, once)
//   { add: [ids], consent? }              follow several (syncing companies saved in this browser)
//   { alerts: "daily"|"weekly"|"off", consent? }  change how alerts arrive
export async function POST(request) {
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`follows:${user.id}`, { max: 60, windowMs: 10 * 60_000 })) return err(429, "rate_limited");
  const body = await readJson(request);
  if (!body) return err(400, "bad_json");
  const db = adminClient();
  if (!db) return err(503, "not_configured");

  // Alerts need consent once. A first follow with the box ticked switches them on (daily).
  const prefs = await alertPrefs(db, user.id);
  let alerts = prefs.alerts;
  const wantsOn = body.consent === true && !prefs.consent;
  if (typeof body.alerts === "string" || wantsOn) {
    const mode = typeof body.alerts === "string" ? body.alerts : "daily";
    const res = await setAlerts(db, user, { mode, consent: body.consent === true });
    if (!res.ok) return err(res.error === "save_failed" ? 500 : 400, res.error);
    alerts = res.alerts;
  }

  if (Array.isArray(body.add)) {
    const ids = cleanOrgIds(body.add);
    if (!ids.length) return err(400, "bad_org");
    const res = await addFollows(db, user.id, ids);
    if (!res.ok) return err(res.error === "limit" ? 409 : 500, res.error);
    return NextResponse.json({ ok: true, added: res.added, limit: res.limit, alerts, follows: (await listFollows(db, user.id)).map((f) => f.org_id) });
  }
  if (body.org_id !== undefined) {
    if (!isOrgId(body.org_id)) return err(400, "bad_org");
    const res = body.on === false ? await removeFollow(db, user.id, body.org_id) : await addFollows(db, user.id, [body.org_id]);
    if (!res.ok) return err(res.error === "limit" ? 409 : res.error === "bad_org" ? 400 : 500, res.error);
    if (res.limit) return err(409, "limit");
    return NextResponse.json({ ok: true, following: body.on !== false, alerts });
  }
  if (typeof body.alerts === "string") return NextResponse.json({ ok: true, alerts });
  return err(400, "nothing_to_do");
}
