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
