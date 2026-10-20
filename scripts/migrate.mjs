// Applies pending supabase/migrations/*.sql to the production database, in order, in ONE transaction.
// A ledger (public._migrations) records what ran, so each file runs once; a failure rolls everything back and
// fails the build, so the database is never left half-migrated or with permissions re-opened.
//
// Runs only for production deploys (VERCEL_ENV=production) or when MIGRATE=1 (local tests). Preview builds and
// local builds never touch the database. No-op without a database URL.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIR = "supabase/migrations";
const LOCK = 7313920; // pg_advisory_xact_lock key: two deploys at once wait for each other

export function migrationFiles(dir = DIR) {
  return readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
}

export async function migrate({ env = process.env, dir = DIR, log = console.log } = {}) {
  const raw = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
  if (!raw) {
    log("migrate: no POSTGRES_URL_NON_POOLING, skipping");
    return { skipped: "no_database" };
  }
  if (env.VERCEL_ENV !== "production" && env.MIGRATE !== "1") {
    log(`migrate: ${env.VERCEL_ENV || "local"} build, skipping (only production deploys migrate)`);
    return { skipped: "not_production" };
  }
  const { default: pg } = await import("pg");
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", ""].includes(url.hostname) || url.searchParams.has("host");
  // Supabase's certificate chain isn't in Node's store; sslmode in the URL would force verification.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("supa");
  const client = new pg.Client({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1)", [LOCK]);
    await client.query("create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())");
    await client.query("revoke all on public._migrations from public");
    for (const role of ["anon", "authenticated"]) {
      const { rows } = await client.query("select 1 from pg_roles where rolname = $1", [role]);
      if (rows.length) await client.query(`revoke all on public._migrations from ${role}`);
    }
    const done = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));
    const pending = migrationFiles(dir).filter((f) => !done.has(f));
    for (const file of pending) {
      await client.query(readFileSync(path.join(dir, file), "utf8"));
      await client.query("insert into public._migrations (name) values ($1)", [file]);
      log(`migrate: applied ${file}`);
    }
    await client.query("commit");
    if (!pending.length) log("migrate: up to date");
    return { applied: pending };
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw new Error(`migrate: FAILED, nothing was applied (${err.message})`);
  } finally {
    await client.end().catch(() => {});
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await migrate();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
