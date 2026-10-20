import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { removedSeeds } from "@/lib/members";

export const dynamic = "force-dynamic";

// People who asked to be removed, so the companies app leaves them out of its company pages right away
// (the company records themselves are cleaned in the next research update). Only short hashes of the
// person keys, so the response doesn't publish who asked.
const hashKey = (id) => createHash("sha256").update(String(id)).digest("hex").slice(0, 16);

export async function GET() {
  const ids = await removedSeeds().catch(() => new Set());
  return NextResponse.json({ hashes: [...ids].map(hashKey) }, { headers: { "cache-control": "public, max-age=60" } });
}
