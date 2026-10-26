// Applies verified provider events to subscriptions, once each (a repeat delivery is skipped). Shared by the webhook and the test checkout.
// Server only.
import { activate, markCanceled, markPastDue, markExpired, handled, recordEvent } from "@/lib/subscription";
import { isPlan } from "@/lib/premium";
import { isUserId } from "@/lib/follows";

export async function applyEvents(db, providerName, events) {
  let applied = 0, repeats = 0, skipped = 0;
  for (const e of events || []) {
    if (!e || !e.id || !isUserId(e.userId) || !["paid", "canceled", "failed", "expired"].includes(e.kind)) { skipped++; continue; }
    if (await handled(db, providerName, e.id)) { repeats++; continue; }
    // Every change below is safe to repeat, so applying first and recording after loses nothing on a crash.
    if (e.kind === "paid") {
      if (!isPlan(e.plan)) { skipped++; continue; }
      await activate(db, { userId: e.userId, plan: e.plan, provider: providerName, providerRef: e.ref, until: e.until || undefined });
    } else if (e.kind === "canceled") await markCanceled(db, e.userId);
    else if (e.kind === "failed") await markPastDue(db, e.userId);
    else await markExpired(db, e.userId);
    await recordEvent(db, { id: e.id, provider: providerName, kind: e.kind, userId: e.userId });
    applied++;
  }
  return { applied, repeats, skipped };
}
