# Landscape

Data layer mapping the creative industry (Israel first). See PLAN.md for the vision.

- Records: `data/orgs/<id>.json`, schema `schema/org.schema.json`, categories `schema/taxonomy.json`.
- Never hand-edit `site/data/`, `site/index.html`, `data/exports/` or `STATS.md` — they're built by `python3 scripts/landscape.py build`.
- To add or update data: write a JSON array to `research/staging/`, then `ingest` → `validate` → `build`.
- Research runs follow `.claude/skills/research/SKILL.md`.
- Accuracy over volume; every record needs sources. Public business info only.
- The explorer UI lives in `site/app.html` (one self-contained file; the build wraps it).
