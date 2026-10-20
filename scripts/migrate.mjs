// Applies supabase/migrations/*.sql in order. Every file is idempotent, so this runs on every build.
// No-op when no database URL is set (local builds, previews without Supabase).
// A failure is logged but does not fail the build, so the site still deploys.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function migrate() {
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!raw) {
    console.log("migrate: no POSTGRES_URL_NON_POOLING, skipping");
    return;
  }
  const { default: pg } = await import("pg");
  // Supabase's certificate chain isn't in Node's store; sslmode in the URL would force verification.
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("supa");
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  const dir = "supabase/migrations";
  try {
    await client.connect();
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(readFileSync(path.join(dir, file), "utf8"));
      console.log(`migrate: applied ${file}`);
    }
  } catch (err) {
    console.warn(`migrate: FAILED (${err.message}). The site deploys, but sign-up and profiles need the schema.`);
  } finally {
    await client.end().catch(() => {});
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await migrate();
