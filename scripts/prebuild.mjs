// Runs before `next dev` / `next build`:
// 1. copies the map app (site/app.html + site/data/*) to public/map/ so it is served at /map;
// 2. applies the database migration when a Postgres URL is available (Vercel + Supabase integration).
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { migrate } from "./migrate.mjs";

rmSync("public/map", { recursive: true, force: true });
mkdirSync("public/map/data", { recursive: true });
cpSync("site/app.html", "public/map/app.html");
cpSync("site/data", "public/map/data", { recursive: true });
console.log("prebuild: copied map app to public/map");

await migrate();
