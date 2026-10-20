# Landscape

Data layer mapping the creative industry (Israel first). See PLAN.md for the vision.

- Records: `data/orgs/<id>.json`, schema `schema/org.schema.json`, categories `schema/taxonomy.json`.
- Never hand-edit `site/data/`, `site/index.html`, `data/exports/` or `STATS.md` — they're built by `python3 scripts/landscape.py build`.
- To add or update data: write a JSON array to `research/staging/`, then `ingest` → `validate` → `build`.
- Research runs follow `.claude/skills/research/SKILL.md`.
- Accuracy over volume; every record needs sources. Public business info only.
- The app lives in `site/app.html` (one file). It loads `data/dataset.json`, `data/signals.json` and `data/logos.json` built into `site/data/`. The build wraps it as `site/index.html` for GitHub Pages; the Artifact publishes `site/app.html` + those three files.
- Signals: `data/signals/YYYY-MM.json`, schema `schema/signal.schema.json`, merged with `landscape.py signals`. They point to orgs and never edit them.
- Per-person data (pipeline, notes, crafts) lives only in the Artifact database under `data/users/<id>/` — private to each person. Never read or write it from research runs.
- Ids never change; merges go in `data/redirects.json`.
- Product decisions: `team/DECISIONS.md`.
- Community app: Next.js at the repo root (`app/`, `components/`, `lib/`), deployed on Vercel. `npm run build` copies the companies app (`site/app.html`) to `public/companies/` (served at `/companies`; `/map` redirects there), builds `lib/generated/people.json` (people already in `key_people`, with a source) and `orgs.json` for search, and runs `supabase/migrations/*.sql` (idempotent) when `POSTGRES_URL_NON_POOLING` is set. Must build with no env vars.
- People's profiles live in Supabase only (RLS). Never put personal data in the repo; research runs don't touch it.
- Naming: the company directory is "חברות" (never "מפה"). Hebrew UI copy is gender-neutral (plural / infinitive), no "את/ה" slashes.
