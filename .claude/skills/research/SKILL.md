---
name: research
description: Run a Landscape research cycle — discover new creative-industry organizations and/or re-verify stale records, merge them into data/orgs, rebuild, and open a PR. Use when asked to "run research", "update the map", "find more studios/startups/clients", "refresh the data", or on a scheduled run.
---

# Landscape research cycle

The repo is a data layer mapping the creative industry (Israel first, then the world).
Each organization is one JSON file in `data/orgs/<id>.json`, validated by
`schema/org.schema.json`, categories from `schema/taxonomy.json`.

## Inputs

The request may name a **mode** and a **segment**. Defaults when nothing is given
(scheduled run): mode `cycle`, segment = the next one in `research/queue.md` that is not ticked.

- `discover <segment>` — find organizations not yet in the map.
- `refresh` — re-verify the stalest / low-confidence records.
- `cycle` — one discover segment + refresh of up to 15 records (the scheduled default).

Segments are listed in `research/queue.md` (e.g. `il-animation-motion`, `il-clients`,
`world-gen-ai-startups`). The user can also give a free-form scope ("Haifa design studios").

## Procedure

1. **Read context**: `schema/org.schema.json`, `schema/taxonomy.json`, `research/queue.md`,
   `research/sources.md`. Run `python3 scripts/landscape.py stats` to see coverage.
2. **Know what exists**: `ls data/orgs` — don't re-research known orgs in discover mode
   (the ingest step dedupes by id, website domain and name anyway).
3. **Research on the web** (WebSearch / WebFetch). For each candidate, verify it exists and is
   active, using the official site plus ideally one independent source. Never invent facts;
   omit unknown fields. If parallel agents are available, split the segment into 2–4 sub-scopes.
4. **Write staging**: a JSON array to `research/staging/<segment>-<YYYY-MM-DD>.json`
   (same shape as the records; `added` / `last_verified` = today).
   - `confidence`: high = official site + independent source agree; medium = one solid source; low = thin.
   - `key_people`: only publicly listed founders/leadership. No personal phones or emails.
   - `relations.target`: an existing org id where one matches, otherwise the plain name.
5. **Refresh** (refresh/cycle mode): `python3 scripts/landscape.py stale --days 90 --limit 15`.
   For each, re-check website/status/size/funding/clients; write the corrected full record to a
   staging file with today's `last_verified`. If an org closed, set `status: closed` (don't delete).
6. **Merge**: `python3 scripts/landscape.py ingest research/staging/<file>.json` then
   `python3 scripts/landscape.py validate` (must pass) and `python3 scripts/landscape.py build`.
   Fix any rejected records and re-ingest.
7. **Log**: append a line to `research/LOG.md`:
   `- YYYY-MM-DD · <mode> · <segment> · +N new, ~M updated · notes`. Tick the segment in
   `research/queue.md` when its coverage looks reasonably complete.
8. **Ship**: commit on a new branch `research/<YYYY-MM-DD>-<segment>`, push, and open a PR
   titled `Research: <segment> (+N, ~M)` listing the new orgs (name — kind — city) and notable
   corrections. Staging files are gitignored (the merged data in data/orgs is the record).

## Quality bar

- Accuracy over volume: 15 verified records beat 50 guesses.
- Israeli presence required for `IL` segments (HQ, founded there, or a real local studio/office).
- Descriptions: 1–3 factual sentences in English; add `name_he` when known.
- Use only taxonomy category slugs; anything else goes in `tags`.
