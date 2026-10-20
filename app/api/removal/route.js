import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { seedById } from "@/lib/people";
import { str } from "@/lib/profile";

export const runtime = "nodejs";

// A request to remove a person listed from public sources. Body: JSON {id, reason?, contact?, confirm: true}.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const seed = seedById(body.id);
  if (!seed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (body.confirm !== true) return NextResponse.json({ error: "confirm" }, { status: 400 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 200) : "";
  const { error } = await admin.from("removal_requests").insert({
    seed_id: seed.id,
    name: seed.name,
    org_ids: seed.roles.map((r) => r.org_id),
    reason: str(body.reason, 1000),
    contact: contact || null,
  });
  if (error) {
    console.error("removal request failed", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
