// Applies verified provider events to subscriptions, once each (a repeat delivery is skipped). Shared by the webhook and the test checkout.
// Server only.
import { activate, markCanceled, markPastDue, markExpired, handled, recordEvent } from "@/lib/subscription";
import { isPlan } from "@/lib/premium";
import { isUserId } from "@/lib/follows";
import { siteUrl } from "@/lib/digest";
import { confirmationEmail } from "@/lib/premiumEmail";
import { notify } from "./notify";

export async function applyEvents(db, providerName, events) {
  let applied = 0, repeats = 0, skipped = 0;
  for (const e of events || []) {
    if (!e || !e.id || !isUserId(e.userId) || !["paid", "canceled", "failed", "expired"].includes(e.kind)) { skipped++; continue; }
    if (await handled(db, providerName, e.id)) { repeats++; continue; }
    // Every change below is safe to repeat, so applying first and recording after loses nothing on a crash.
    if (e.kind === "paid") {
      if (!isPlan(e.plan)) { skipped++; continue; }
      const { first } = await activate(db, { userId: e.userId, plan: e.plan, provider: providerName, providerRef: e.ref, until: e.until || undefined, amount: e.amount });
      // A new plan (not a renewal) gets the written details of the deal by email.
      if (first) {
        const { data: row } = await db.from("subscriptions").select("plan, amount, started_at, current_period_end").eq("user_id", e.userId).maybeSingle();
        if (row) await notify(db, { userId: e.userId, key: `premium-confirm:${providerName}:${e.id}`,
          message: confirmationEmail({ plan: row.plan, amount: row.amount, startedAt: row.started_at, periodEnd: row.current_period_end, base: siteUrl() }) });
      }
    } else if (e.kind === "canceled") await markCanceled(db, e.userId);
    else if (e.kind === "failed") await markPastDue(db, e.userId);
    else await markExpired(db, e.userId);
    await recordEvent(db, { id: e.id, provider: providerName, kind: e.kind, userId: e.userId });
    applied++;
  }
  return { applied, repeats, skipped };
}
