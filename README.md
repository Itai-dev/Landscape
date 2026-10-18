# Landscape

A living map of the creative industry — starting with Israel. Studios, production companies,
creative-tech startups, agencies and the brands that buy creative work, in one searchable,
source-backed data layer that keeps itself up to date.

- **Browse:** open the explorer (GitHub Pages, see below) or `site/index.html` locally via any static server.
- **Spreadsheet:** `data/exports/landscape.csv`
- **Coverage:** [`STATS.md`](STATS.md) · **Plan:** [`PLAN.md`](PLAN.md)

## How it works

```
research (Claude, weekly or on demand)
   └─> research/staging/*.json ──ingest──> data/orgs/<id>.json ──build──> site/ + exports
                                  (dedupe, merge, validate)              (explorer, CSV, stats)
```

Each research run opens a pull request, so new findings are reviewed before they land.

### Run research on demand
- In a Claude Code session on this repo: *"run research on il-vfx-post"* or *"find design studios in Haifa"*.
- Or on GitHub: **Actions → Research → Run workflow** (needs a `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` repo secret).

Segments and their order live in [`research/queue.md`](research/queue.md).

### Commands

```bash
pip install jsonschema
python3 scripts/landscape.py validate          # check all records
python3 scripts/landscape.py ingest FILE.json  # merge new/updated records
python3 scripts/landscape.py build             # rebuild explorer data, CSV, STATS.md
python3 scripts/landscape.py stale --days 90   # what needs re-verifying
python3 -m http.server -d site 8000            # browse locally at localhost:8000
```

### Publish the explorer
Settings → Pages → Source: **GitHub Actions**. Every merge to `main` redeploys it.

## Record format

One file per organization in `data/orgs/`. Required: `id, name, kind, categories, description,
location, sources, confidence, last_verified`. Optional: Hebrew name, founded, size, website & social
links, services, notable clients & work, key people (public leadership only), funding, client
profile (industry, creative needs, agencies), relations (client / parent / acquired_by / partner…), tags.
Full schema: [`schema/org.schema.json`](schema/org.schema.json).
