# Team decisions — v2

_2026-10-18 · Founder, Creative Director, UX/UI Designer, Developer, Researcher · memos in `round1/` and `round2/`_

## What v2 is for
One job: **"When my pipeline goes quiet, show me who buys what I make, the way in, and a reason to reach out now."**
User #1 is the owner; then a small invited beta (owner + 5–10 trusted creatives). Every feature must pass the test:
*did it start a real conversation this week?*

## Decisions

| # | Question | Decision | Vote |
|---|---|---|---|
| 1 | Navigation | Bottom tabs **Explore · Signals · Pipeline**. Inside Explore, lenses **Brands · Collaborators · All**. "Ask" will live in the search field (v3). | 5–0 |
| 2 | Jobs | No Jobs tab without data. **Hiring** is a signal type with its own filter. | 5–0 |
| 3 | "Clients" → **"Brands"** | In the UI only; `kind: "client"` stays in the data so the contract is stable. "Client" becomes a pipeline stage. | 5–0 |
| 4 | Taxonomy | Light split now: each category slug gets a **facet** (craft / industry / product / agency). Free-text `creative_needs` map to a **controlled needs list** via an alias file — no record edits. | 5–0 |
| 5 | Pipeline | Private per person (Artifact `db`, `data/users/<id>/`). Stages: **Watching · To pitch · Contacted · In talks · Client · Passed**, plus note and follow-up date. **Export my data** ships with it. | 5–0 |
| 6 | Signals storage | **Split vote** (db-live: Founder, UX, Researcher; db + owner approval: CD; git via PR: Developer). **Decision:** signals are their own records (never inside org files), archived in git (`data/signals/`) and published with the page; the weekly run also writes them live to the app database when it can. Every signal shows date + source; the owner can **hide** a bad one with one tap. | 3–1–1 |
| 7 | Packaging | Stop inlining everything into one 1.66 MB page. Publish **page + dataset + signals + logos** as separate files. | 5–0 |
| 8 | Visual | Now: fix the accent/brand-blue clash, reduce type colours to **3 groups** (makers · tech · buyers), 44px touch targets. Later: font change and the full "call sheet" look. | 3–2 |
| 9 | Credits ("who made which ad") | Later as a record type (at ~50–100 credits). For now campaign signals carry agency / production / studio. | 5–0 |
| 10 | People | Only publicly announced business roles; add `role_type`, `source`, `as_of`. Prioritise people who *commission* work (heads of production, agency producers, marketing heads) — next buyer-side research run. No personal contact details, ever. | 5–0 |
| 11 | Fields now | `contact_url`, `careers_url`, `reel_url`, people `role_type/source/as_of`. Others (peak periods, style…) wait until research can source them. | 4–1 |
| 12 | Platform | Stay on the claude.ai Artifact for the beta. Own stack (Vercel + Postgres + auth) only when public profiles / community are needed. Ids never change; `data/redirects.json` for merges. | 5–0 |

## v2 build scope (this session)
1. Data contracts: signal schema + the 13 verified sample signals, taxonomy facets, needs list + alias map, new optional fields, `schema_version`.
2. Multi-file publish.
3. App shell: bottom tabs, lenses, filter sheet (Craft / Industry), "I make" craft picker, Brands rename, colour fixes.
4. Detail sheet v2: action row (save · stage · note · follow-up), **Why now** (signals), **What they buy**, **Ways in** (grouped connections), details folded.
5. Pipeline tab (due first, grouped by stage, export).
6. Signals tab (type filters incl. Hiring, add to pipeline, fade after 60 days, owner hide).
7. **Best fit** ranking: needs ∩ my crafts + recent signals + an agency route.

## Shipped after v2
- **Pitch draft** (v3): Why now (a signal or your own reason, required) · Who (marketing/production people first, then the agency route) · About you · What to show (one work sample, required) · English/Hebrew. Drafts only; the person edits and sends it themselves. Saving a draft sets one follow-up in a week.
- **Report a mistake**: goes to a private `reports` area only the owner (and research runs) can read.

- **Ask the map** (search field → "Ask ✦", or Enter on a question): Claude answers from the map only, using page tools (search_orgs, get_org, recent_signals, my_pipeline) and lists the companies it used as tappable cards.
- **Hebrew UI**: full English/Hebrew string table, right-to-left layout, Hebrew labels for every category and need, Hebrew names first in Hebrew mode. Record descriptions stay English (as sourced).

- **AI-first home** (owner feedback: "a database feels old-fashioned"): the app now opens on a single prompt — "What are you looking for?" — with suggested questions based on your crafts and a "This week" strip of signals. Answers come back as a short summary plus result cards (why it fits · what they buy · Save · Pitch · Open) and follow-up questions; live steps show what's being checked. Browse (the old directory) is the second tab. Without Claude (e.g. GitHub Pages) it falls back to keyword matches.

## Waits (in rough order)
v3: AI pitch draft (Why now · Who · Way in · What to show; drafts only, never sends) → Ask the map → "this is wrong" reports → credits type → Hebrew UI → onboarding → profiles & community on our own stack → world.

## Next research runs
1. Buyer side: commissioning people, contact/careers pages, agency websites, more brands (target ~120 buyer records).
2. Signals from ~8 fixed source pages (Globes ad-agency tag, ICE ad-of-the-week, Geektime funding, CTech, LinkedIn jobs…).
3. Reel links for the 102 studios.
