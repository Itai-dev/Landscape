import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { listFollows, alertPrefs, addFollows, removeFollow, setAlerts, isOrgId, cleanOrgIds } from "@/lib/follows";
import { planOf } from "@/lib/subscription";
import { PREMIUM, followLimit } from "@/lib/premium";
import { billingReady } from "@/lib/billing";
import { readJson, allow } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });
const NO_STORE = { headers: { "cache-control": "private, no-store" } };

// GET: the signed-in person's follows and alert choice (read with their own session, RLS: own rows only).
// Signed out, it only says whether sign-up is available, so pages know which button to show.
// `max` is how many companies this person can track (the free tier when signed out); `premium` and
// `offer` (premium is on, so pages can point to it) let pages explain the limit; `paywall` says the free limit
// applies (payments are open; before that premium is a waitlist and the old cap stays).
const tier = (premium) => { const paywall = billingReady(); return { max: followLimit(premium, paywall), premium, offer: PREMIUM, paywall }; };
export async function GET() {
  const sb = await serverClient();
  if (!sb) return NextResponse.json({ signup: false, signedIn: false, follows: [], ...tier(false) }, NO_STORE);
  const user = await currentUser(sb).catch(() => null);
  if (!user) return NextResponse.json({ signup: true, signedIn: false, follows: [], ...tier(false) }, NO_STORE);
  const db = adminClient();
  if (!db) return NextResponse.json({ signup: true, signedIn: true, follows: [], alerts: "off", consent: false, ...tier(false) }, NO_STORE);
  const [follows, prefs, plan] = await Promise.all([listFollows(db, user.id).catch(() => []), alertPrefs(db, user.id), planOf(db, user.id)]);
  // "instant" is a premium choice; after a plan ends it works as daily (lib/alertsSend.js does the same).
  const alerts = prefs.alerts === "instant" && !plan.premium ? "daily" : prefs.alerts;
  return NextResponse.json({ signup: true, signedIn: true, follows: follows.map((f) => f.org_id), alerts, consent: prefs.consent, ...tier(plan.premium) }, NO_STORE);
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
  const [prefs, plan] = await Promise.all([alertPrefs(db, user.id), planOf(db, user.id)]);
  let alerts = prefs.alerts;
  const wantsOn = body.consent === true && !prefs.consent;
  if (typeof body.alerts === "string" || wantsOn) {
    const mode = typeof body.alerts === "string" ? body.alerts : "daily";
    const res = await setAlerts(db, user, { mode, consent: body.consent === true, premium: plan.premium });
    if (!res.ok) return err(res.error === "save_failed" ? 500 : res.error === "premium_required" ? 402 : 400, res.error);
    alerts = res.alerts;
  }

  if (Array.isArray(body.add)) {
    const ids = cleanOrgIds(body.add);
    if (!ids.length) return err(400, "bad_org");
    const res = await addFollows(db, user.id, ids, plan.limit);
    if (!res.ok) return err(res.error === "limit" ? 409 : 500, res.error);
    return NextResponse.json({ ok: true, added: res.added, limit: res.limit, max: plan.limit, alerts, follows: (await listFollows(db, user.id)).map((f) => f.org_id) });
  }
  if (body.org_id !== undefined) {
    if (!isOrgId(body.org_id)) return err(400, "bad_org");
    const res = body.on === false ? await removeFollow(db, user.id, body.org_id) : await addFollows(db, user.id, [body.org_id], plan.limit);
    if (!res.ok) return err(res.error === "limit" ? 409 : res.error === "bad_org" ? 400 : 500, res.error);
    if (res.limit) return NextResponse.json({ error: "limit", max: plan.limit, offer: PREMIUM && !plan.premium }, { status: 409 });
    return NextResponse.json({ ok: true, following: body.on !== false, alerts });
  }
  if (typeof body.alerts === "string") return NextResponse.json({ ok: true, alerts });
  return err(400, "nothing_to_do");
}
