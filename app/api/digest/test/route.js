import { NextResponse } from "next/server";
import { cronAuthorized, sendBatch, missingSendEnv } from "@/lib/mailer";
import { message } from "@/lib/digestSend";
import { CRAFT_SLUGS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: curl -H "Authorization: Bearer $CRON_SECRET" "/api/digest/test?to=me@example.com&crafts=motion-design,vfx"
// Sends this week's edition to one address, or with &preview=1 returns the email's HTML without sending.
export async function GET(request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const crafts = String(sp.get("crafts") || "").split(",").filter((c) => CRAFT_SLUGS.includes(c));
  const frequency = ["weekly", "biweekly", "monthly"].includes(sp.get("frequency")) ? sp.get("frequency") : "weekly";
  const to = String(sp.get("to") || "").trim();
  const m = message({ userId: null, email: to || "preview@example.com", prefs: { frequency, topics: [] }, crafts });
  if (sp.get("preview") === "1") return new NextResponse(m.email.html, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: "bad_to" }, { status: 400 });
  const missing = missingSendEnv();
  if (missing.length) return NextResponse.json({ skipped: "missing_env", missing, subject: m.email.subject });
  try {
    const res = await sendBatch([{ ...m.email, subject: `[בדיקה] ${m.email.subject}` }]);
    return NextResponse.json({ ok: !res.skipped, id: res.ids[0] || null, subject: m.email.subject, items: m.digest.items.length });
  } catch (e) {
    return NextResponse.json({ error: "send_failed", status: e.status || null }, { status: 502 });
  }
}
