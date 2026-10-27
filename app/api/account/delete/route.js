import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/guard";
import { getSubscription } from "@/lib/subscription";
import { cancelPlan } from "@/lib/billing/cancel";

export const runtime = "nodejs";

// Deletes the signed-in account: auth user (profile + newsletter rows cascade) and any stored CV.
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  // A paid plan still renewing is cancelled first, the same way as the cancel button (including any refund
  // owed); otherwise deleting the account would delete our record of it while the card keeps being charged.
  const sub = await getSubscription(admin, user.id);
  if (sub && ["active", "past_due"].includes(sub.status)) {
    const out = await cancelPlan(admin, user.id, sub);
    if (out.error) return NextResponse.json({ error: "cancel_plan_first" }, { status: 409 });
  }

  const { data: files } = await admin.storage.from("cvs").list(user.id).catch(() => ({ data: [] }));
  if (files?.length) await admin.storage.from("cvs").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  await sb.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
