import { mcpOn } from "@/lib/config";
import { allow, MAX_BODY } from "@/lib/guard";
import { handleRpc } from "@/lib/mcp";

// CreativeIn as a connector (MCP server, "Streamable HTTP" in its stateless form): an assistant such as
// Claude or ChatGPT POSTs one JSON-RPC message and gets one JSON answer. Read-only tools over the published
// directory (lib/mcp.js), no sign-in, no cookies read, nothing written. Unlike the site's own POST routes it
// answers other origins by design (the caller is an assistant, not our pages), so it never touches a session.
export const runtime = "nodejs";

const PER_IP = { max: 60, windowMs: 60_000 };
const EVERYONE = { max: 3000, windowMs: 60 * 60_000 };
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id",
  "access-control-max-age": "86400",
};
const json = (body, status = 200, extra = {}) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const fail = (status, code, message, extra) => json({ jsonrpc: "2.0", id: null, error: { code, message } }, status, extra);
// Tool names only, for counting use in the logs; never what was asked.
const log = (method, tool) => console.log(`mcp ${method} ${tool}`);

export async function POST(request) {
  if (!mcpOn()) return fail(404, -32000, "Not available");
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allow(`mcp:${ip}`, PER_IP) || !allow("mcp:*", EVERYONE)) return fail(429, -32000, "Too many requests. Try again in a minute.", { "retry-after": "60" });
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return fail(415, -32700, "Send JSON (content-type: application/json)");
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return fail(413, -32600, "Request too large");
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return fail(text ? 413 : 400, text ? -32600 : -32700, text ? "Request too large" : "Empty request");
  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    return fail(400, -32700, "Parse error");
  }
  // A batch (older protocol versions): answer each request; notifications get no entry.
  if (Array.isArray(msg)) {
    if (!msg.length || msg.length > 20) return fail(400, -32600, "Invalid request");
    const out = msg.map((m) => handleRpc(m, { log })).filter(Boolean);
    return out.length ? json(out) : json(null, 202);
  }
  const out = handleRpc(msg, { log });
  return out ? json(out) : json(null, 202);
}

export function OPTIONS() {
  return json(null, 204);
}

// No server-to-client stream is offered: per the protocol, GET answers 405.
export function GET() {
  if (!mcpOn()) return fail(404, -32000, "Not available");
  return fail(405, -32000, "This is the CreativeIn connector for AI assistants. Add its address as a custom connector (MCP) in Claude or ChatGPT; it answers POST only.", { allow: "POST, OPTIONS" });
}
export const DELETE = GET;
