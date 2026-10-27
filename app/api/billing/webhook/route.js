import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { PREMIUM } from "@/lib/premium";
import { provider } from "@/lib/billing";
import { applyEvents } from "@/lib/billing/apply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The payment provider calls this after a charge, a renewal, a failed renewal or a cancellation. Not a browser
// request, so no same-origin check: every call must pass the provider's own signature check instead.
// Each event is applied once (billing_events), so repeat deliveries are harmless.
export async function POST(request) {
  if (!PREMIUM) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const p = provider();
  if (!p) return NextResponse.json({ error: "billing_not_ready" }, { status: 503 });
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 64 * 1024) return NextResponse.json({ error: "bad_body" }, { status: 400 });
  const events = await p.events({ raw, headers: request.headers }).catch(() => null);
  if (!events) return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const out = await applyEvents(db, p.name, events);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    // A 5xx makes the provider retry later; events already applied are skipped on the retry.
    console.error("billing webhook failed", e.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
