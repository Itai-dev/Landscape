import { NextResponse } from "next/server";
import { serverClient, currentUser, adminClient } from "@/lib/supabase/server";
import { allow } from "@/lib/guard";
import { PREMIUM } from "@/lib/premium";
import { planOf } from "@/lib/subscription";
import { listFollows } from "@/lib/follows";
import { exportCsv, EXPORT_KINDS } from "@/lib/exportCsv";
import { siteUrl } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const err = (status, error) => NextResponse.json({ error }, { status });

// GET /api/export?type=companies|people&kind=&city=&category=&mine=1 → a CSV download. Premium only.
// mine=1 limits it to the companies in the person's tracking list.
export async function GET(request) {
  if (!PREMIUM) return err(404, "not_found");
  const sb = await serverClient();
  const user = await currentUser(sb);
  if (!user) return err(401, "signed_out");
  if (!allow(`export:${user.id}`, { max: 20, windowMs: 60 * 60_000 })) return err(429, "rate_limited");
  const db = adminClient();
  if (!db) return err(503, "not_configured");
  if (!(await planOf(db, user.id)).premium) return err(402, "premium_required");
  const q = new URL(request.url).searchParams;
  const type = EXPORT_KINDS.includes(q.get("type")) ? q.get("type") : "companies";
  const ids = q.get("mine") === "1" ? (await listFollows(db, user.id)).map((f) => f.org_id) : null;
  const { csv } = exportCsv(type, { kind: q.get("kind"), city: q.get("city"), category: q.get("category"), ids }, siteUrl());
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="creativein-${type}-${day}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
