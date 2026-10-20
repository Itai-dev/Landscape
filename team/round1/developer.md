# Developer / architect — Round 1

## 1. Where we are (honest)
- **Data layer is solid**: strict schema, sources/confidence per record, PR review, CI (`validate.yml`). Keep it.
- **The app is a read-only viewer** (`site/app.html`): no notes, feed or AI.
- **Artifact build is the weak spot**: `standalone` inlines data + base64 logos → **1.66 MB HTML** (354 KB JSON + 961 KB logos). At ~2,000 orgs that's ~12 MB, near the 16 MB cap, and slow on a phone.
- **Graph is half-wired**: only 96 of 192 `relations` resolve to an org id. `connections()` is O(n²) on every open; fine now, slow at 5k.
- **No contract for anything except orgs**: no signal schema, no per-user schema, no `schema_version` in `dataset.json`.

## 2. Architecture for v2: where each kind of state lives

| State | Home | Who writes | Why |
|---|---|---|---|
| Orgs (the map) | git `data/orgs/*.json` → published file `data/dataset.json` | research PR, owner merges | reviewed, diffable, portable |
| Signals (news) | Artifact `db` collection `signals/<sig_id>` + archive in git `data/signals/YYYY-Www.json` | weekly Claude run (via ArtifactData, as owner) | fresh on Monday without waiting for a merge; git keeps history |
| Pipeline / notes / prefs | Artifact `db` `data/users/<uid>/…` | each viewer, private | platform-enforced privacy, even from the owner |

**db rules** (manifest):
```js
db: { rules: [
  { path: "", read: "view", write: "owner" },           // signals: everyone reads, only owner/Claude writes
  { path: "data/users/{self}", write: "interact" } ] },  // each person writes only their own
user: {}                                                 // id only; no names/emails stored
```

**Signal** (`schema/signal.schema.json`):
```json
{ "id": "sig-2026-10-20-artlist-3f9a1c",   // date + org + hash(url): dedupes reruns
  "type": "funding|agency_move|rebrand|new_exec|campaign|job_post|launch|acquisition|closure",
  "org_id": "artlist", "related_ids": ["mccann-tel-aviv"],
  "date": "2026-10-19", "headline": "Artlist raises $… Series B",
  "url": "https://…", "source": "Calcalist",
  "why": "Fresh budget → likely brand/video push in Q1",
  "confidence": "high", "added": "2026-10-20", "v": 1 }
```
Research flow: new SKILL step 5b → `research/staging/signals-<date>.json` → `landscape.py signals` (validate, dedupe by id, check `org_id` exists, unknown orgs get queued as discovery candidates) → git archive + `ArtifactData batch` into `signals`. Prune db to the last 180 days (db scans collections without indexes; cap is 25k docs). GitHub Action backup can write git only, not db; the app falls back to `data/signals.json` published with the page.

**Per-user** (path parity matters: `data/users/<uid>` is a collection):
```
data/users/<uid>/prefs                 { skills:["motion-design"], cities:[], seen_signals_until, v:1 }
data/users/<uid>/crm/pipeline/<org_id> { org_id, stage:"watch|to_pitch|contacted|in_talks|client|passed",
                                         note, next_action, next_date, updated_at, v:1 }
```
One doc per org → no lost updates between phone and laptop; `where("stage","==",…)` works.

**Loading the dataset**: stop inlining. Publish a multi-file artifact: `index.html` + `data/dataset.json` + `data/logos.json` (id → 64px WebP data-URL, ~2–3 KB each, lazy-loaded after first paint). Per-logo files would hit the 511-files-per-version cap at ~500 orgs. The app's existing `fetch("data/dataset.json")` path then works identically on GitHub Pages and the Artifact. At ~3k orgs, split into `index.json` (card fields) + lazy detail shards; build also precomputes `edges` (reverse relations, shared clients) so the client stops doing O(n²).

**Ask the map** (`sample` + page tools, `modelTier:"default"`, on a button press only):
- Prompt carries a compact index (id, name, kind, categories, city ≈ 26 KB today) + the user's prefs.
- Tools (each returns ≤32 KB of plain data): `search_orgs({q,kind,category,city,need,limit})`, `get_org({id})`, `connections({id})`, `recent_signals({org_ids?,type?,days})`, `my_pipeline({stage?})`, and `add_to_pipeline({org_id,stage})` behind a confirm chip.
- Answers cite org ids → tappable cards. Spends the **viewer's** Claude usage (consent on first call); 30–90 s, so show progress.

## 3. Build next (2–4 weeks, in order)
1. **Contracts first (2 days)**: `schema_version` in dataset, `signal.schema.json`, `pipeline.schema.json`, `data/redirects.json` (merged/renamed id → surviving id), and the rule *ids never change or get reused*. Fix relation resolution in `build`.
2. **Multi-file publish + logos pack (2 days)**: replaces `standalone`.
3. **Pipeline + notes (4 days)**: stage chip on cards/sheet, "My pipeline" tab, **Export my data (JSON)** from day one via `downloads`.
4. **Signals (1 week)**: research step + feed tab + "new" badges on orgs.
5. **Who to pitch (3 days)**: client-side scoring on `creative_needs` ∩ prefs.skills + recent signals + shared-client paths.
6. **Ask the map (4 days)**: last, once tools have real data (signals, pipeline) to call.

## 4. Not yet, and risks
- **Not yet**: own backend, profiles/sign-up, people layer beyond `key_people`, job-post scraping (noisy; manual `job_post` signals only), `room`/`mcp`.
- **Platform limits, plainly**: every viewer needs a claude.ai sign-in and an invite. Writing your own `data/users/` area needs Contributor level; **people from outside the owner's org get `view` (read-only, no CRM) unless made Editor, and Editor can also publish page versions.** Public-link visitors are read-only. So: great owner tool + small trusted beta, **not** a community.
- **Per-user data is unreadable by the owner and can't be bulk-migrated** (ids are opaque, scoped). Migration = each user exports and re-imports. Hence export in step 3.
- Signals skip PR review: fine, they add sourced news, never edit orgs.

## 5. Migration path (keep the door open)
Vercel (static/Next) + Supabase: `orgs(id pk, data jsonb, updated)`, `signals(id pk, …)`, `users`, `pipeline(user_id, org_id, stage, note, …, pk(user_id,org_id))`, RLS `user_id = auth.uid()` mirrors `{self}`. Git stays the editorial source; an Action upserts `data/orgs` + `data/signals` on merge. Same JSON shapes, so the app swaps a data adapter, not its UI.

## 6. Decisions I want
1. **Signals live in db, archived in git, no PR gate?** → Yes.
2. **Stop the inline standalone build; publish multi-file?** → Yes, now.
3. **Ids are permanent, with `redirects.json`?** → Yes, written into CLAUDE.md.
4. **Beta = owner + ≤10 invited Editors on the Artifact; public community only on our own stack?** → Yes; revisit at ~50 interested users.
5. **Export-my-data ships with the CRM, not later?** → Yes, it's our migration bridge.
