// Fetches a public portfolio page as plain text for the profile draft.
// Guards: http(s) only, no private/internal addresses, 8s timeout, 1.5 MB cap, HTML/text only.
import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const PROFILE_HOSTS = /(?:behance\.net|vimeo\.com|youtube\.com|instagram\.com|artstation\.com|dribbble\.com|linkedin\.com|github\.com|imdb\.com|tiktok\.com)/i;

function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivate(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("only http(s) links");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("unusual port");
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("address not allowed");
}

const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function htmlToText(html, base) {
  const meta = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) meta.push(`Title: ${decode(title).trim()}`);
  for (const m of html.matchAll(/<meta\s+[^>]*(?:name|property)=["'](description|og:title|og:description|og:site_name)["'][^>]*>/gi)) {
    const content = m[0].match(/content=["']([^"']*)["']/i)?.[1];
    if (content) meta.push(`${m[1]}: ${decode(content).trim()}`);
  }
  const links = new Set();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const href = new URL(decode(m[1]), base);
      if (PROFILE_HOSTS.test(href.hostname)) links.add(href.toString());
    } catch {}
  }
  // Image descriptions: client logos are often only images, named in their alt text.
  const alts = [...new Set([...html.matchAll(/<img\s[^>]*alt=["']([^"']{2,60})["']/gi)].map((m) => decode(m[1]).trim()).filter(Boolean))].slice(0, 80);
  if (alts.length) meta.push(`Images: ${alts.join(" · ")}`);
  const body = decode(
    html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  ).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return { text: [...meta, "", body].join("\n").slice(0, 15000), links: [...links].slice(0, 15) };
}

export async function fetchPageText(raw) {
  let u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (/linkedin\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
    return { url: u.toString(), text: "", links: [], note: "linkedin" };
  }
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(u);
    const res = await fetch(u, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "LandscapeProfileBot/1.0 (+profile draft from a link the person gave)", accept: "text/html,text/plain" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      u = new URL(res.headers.get("location"), u);
      continue;
    }
    if (!res.ok) throw new Error(`page returned ${res.status}`);
    const type = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) throw new Error("not a web page");
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    const html = new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    return { url: u.toString(), ...htmlToText(html, u) };
  }
  throw new Error("too many redirects");
}
