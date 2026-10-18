# Landscape — plan

**Vision:** a living, searchable map of the creative industry — Israel first, then the world —
that helps creative people find collaborators, understand the market and land work.

## Building blocks

| Layer | What | Where |
|---|---|---|
| Data | One JSON record per organization (studio, production co., startup, agency, client, community), strict schema, sources + confidence + last-verified date on every record | `data/orgs/`, `schema/` |
| Tooling | validate · ingest (dedupe + merge) · build · stale · stats | `scripts/landscape.py` |
| Research engine | A research playbook Claude follows; segment queue; source list; log | `.claude/skills/research/`, `research/` |
| Automation | Weekly Claude scheduled task → research cycle → PR for review. On demand: ask Claude "run research on X", or the GitHub Action button | Claude scheduled task, `.github/workflows/research.yml` |
| Explorer | Mobile-friendly search / filter / detail view, with a "connections" graph (shared clients, agencies, parents, acquisitions) | `site/` → GitHub Pages |
| Exports | CSV for spreadsheets / CRM import, stats summary | `data/exports/`, `STATS.md` |

Every change to the data arrives as a pull request, so you review what the research found
before it lands, and git history shows how the landscape changes over time.

## Phases

1. **Israel — studios & creative tech** *(started)* — animation & motion, VFX & post, design &
   branding, production & sound & games, gen-AI startups, creative platforms (Artlist, Wix, Fiverr…).
2. **Israel — potential clients** *(seeded)* — ad / digital / media agencies, big advertisers,
   tech companies with heavy brand & video output, public sector.
3. **World** — global creative-tech, leading studios, international buyers open to Israeli talent.
4. **Make it useful for work** — ideas, in rough priority:
   - "Who to pitch" views: clients by creative need (animation, 3D, social video…) and their agencies
   - Signals: funding rounds, rebrands, new CMOs, campaign launches → fresh leads
   - Personal CRM layer: notes, status (contacted / in talks / client), follow-ups
   - Hebrew UI, map view, people layer (public creative directors / heads of studio)
   - Open it to the community: submissions form, public read-only site

## Data rules

- Accuracy over volume; every record cites sources. `confidence`: high / medium / low.
- Only public business information. People = publicly listed founders / leadership, no personal contact details.
- Records are never deleted when a company closes — `status` changes instead.
- Records older than 90 days (or low confidence) are re-verified by the refresh cycle.
