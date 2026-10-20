// Test stub for "next/server": just enough of NextResponse for route handlers run outside Next.
export class NextResponse extends Response {
  static redirect(url, status = 307) {
    return new Response(null, { status, headers: { location: String(url) } });
  }
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } });
  }
}
