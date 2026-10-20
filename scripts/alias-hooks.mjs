// Node module hooks so scripts can import app code that uses the "@/…" alias (jsconfig.json) and JSON.
// Used by scripts/test-alerts.mjs via module.register().
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") + path.sep;

export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) {
    let p = ROOT + spec.slice(2);
    if (!existsSync(p)) for (const e of [".js", ".mjs", ".json"]) if (existsSync(p + e)) { p += e; break; }
    return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  if (spec.startsWith(".") && !/\.[mc]?js$|\.json$/.test(spec) && ctx.parentURL) {
    const r = new URL(spec, ctx.parentURL);
    for (const e of [".js", ".mjs"]) if (existsSync(new URL(r.href + e))) return { url: r.href + e, shortCircuit: true };
  }
  return next(spec, ctx);
}

export async function load(url, ctx, next) {
  if (url.endsWith(".json")) return next(url, { ...ctx, importAttributes: { type: "json" } });
  if (url.startsWith(pathToFileURL(ROOT).href) && url.endsWith(".js")) return next(url, { ...ctx, format: "module" });
  return next(url, ctx);
}
