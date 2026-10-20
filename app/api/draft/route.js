import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/guard";
import { serverClient, currentUser } from "@/lib/supabase/server";
import { aiReady } from "@/lib/config";
import { fetchPageText } from "@/lib/fetchPage";
import { draftProfile } from "@/lib/draft";
import { cleanProfile, missingFields, filledFields, url as cleanUrl } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF = 10 * 1024 * 1024;
const err = (status, error, extra = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sb = await serverClient();
  if (!sb) return err(503, "not_configured");
  const user = await currentUser(sb);
  if (!user) return err(401, "sign_in");
  if (!aiReady()) return err(503, "ai_unavailable");

  const form = await request.formData();
  const file = form.get("cv");
  const link = String(form.get("url") || "").trim();
  const text = String(form.get("text") || "").trim().slice(0, 20000);

  let pdf = null;
  if (file && typeof file === "object" && file.size > 0) {
    if (file.size > MAX_PDF) return err(413, "pdf_too_big");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString() !== "%PDF-") return err(415, "not_pdf");
    pdf = bytes.toString("base64");
  }

  const notes = [];
  let page = null;
  if (link) {
    if (!cleanUrl(link)) return err(400, "bad_url");
    try {
      page = await fetchPageText(cleanUrl(link));
      if (page.note === "linkedin") notes.push("linkedin");
      else if (page.text.replace(/\s/g, "").length < 200) notes.push("page_thin");
    } catch {
      notes.push("page_failed");
    }
  }

  if (!pdf && !text && !page?.text) return err(400, "no_sources", { notes });

  let draft;
  try {
    const raw = await draftProfile({ pdf, pageText: page?.text, pageUrl: page?.url, text });
    draft = cleanProfile(raw);
  } catch (e) {
    console.error("draft failed", e?.status || "", e?.message);
    return err(502, e?.code === "refused" ? "refused" : "ai_failed", { notes });
  }

  // The link the person gave is theirs even if the AI didn't echo it.
  if (page?.url && !draft.portfolio_url && page.note !== "linkedin") draft.portfolio_url = page.url;
  if (page?.note === "linkedin" && !draft.links.some((l) => /linkedin\.com/i.test(l.url))) {
    draft.links.push({ label: "LinkedIn", url: page.url });
  }

  return NextResponse.json({
    draft,
    ai_fields: filledFields(draft),
    missing: missingFields(draft),
    notes,
  });
}
