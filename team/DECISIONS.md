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

## Community v1 (own stack, free tiers)
Owner brief: profiles anyone can see, onboarding that fills itself from LinkedIn / portfolio / CV with a questionnaire fallback, email sign-up that builds a mailing list, find people (not only companies), newsletter at a chosen frequency.
- **Stack**: Next.js app at the repo root on Vercel; Supabase (Postgres, email magic-link auth) through the Vercel Marketplace integration; Claude API for the profile draft. The map app keeps living at `/map` (copied from `site/` at build).
- **Onboarding** (`/onboard`): any of CV/LinkedIn PDF, portfolio link, or free text → AI draft → questions **only** for missing required fields (name, headline, crafts, city, open to) + visibility + newsletter → full review with AI-filled fields marked → saved only on approval. "No sources" goes straight to the questionnaire; any AI failure falls back to it too.
- **LinkedIn**: scraping is blocked and against its terms, so we ask for the "Save to PDF" export and only store a LinkedIn URL as a link.
- **Privacy** (Israeli Privacy Protection Amendment 13 + anti-spam law): newsletter opt-in is an unchecked box; consent time + wording are stored; visibility per profile (public / members / hidden, default members); no emails or phones on profiles (stripped from AI output too); CV kept only if the person ticks a box, in a private bucket; delete-account button removes everything. Contact between people will go through the platform later.
- **Schema**: `profiles`, `newsletter_prefs` with RLS (owner writes; public rows to everyone; members rows to signed-in users). Migration is idempotent and runs on every Vercel build when the database URL is present.
- **Graceful without config**: with no env vars the site builds and shows "בקרוב" notices instead of sign-up.
- Next: people search with AI across people + companies, newsletter sending (Resend), contact requests, Hebrew-name slugs.

## Visual design v2 (owner: "Dribbble's look, with Simply's purple")
- **Look**: white canvas, deep-purple ink, dark pill primary buttons, soft grey pill search with a round accent button, outlined pill tags, image-first people cards (cover tile, headline on hover, avatar + name below). Inspiration only: no Dribbble name, logo, copy or assets.
- **Colour**: one accent, Simply's `--color-primary-purple-haze` `#8217ff` (from hellosimply.com's CSS); ink is Simply's deep purple `#110034`. Both pass WCAG AA on white. Org-group colours (makers / tech / buyers) stay for the map; buyer moved from magenta to raspberry so it doesn't read as the accent.
- **Type**: Mona Sans for Latin, Heebo for Hebrew (Mona Sans has no Hebrew; Heebo is the closest neutral grotesque).
- **One product**: the same tokens in `app/globals.css` and `site/app.html`.

## Design round 1: layout, naming, people seed (owner feedback on v2)
- **Layout**: search moved out of the header. Header = logo, People, Companies, one call to action (same bar in the companies app). Centered hero and section intros; one container (max 1200px, side gutter 20–48px); spacing, type and radius scales as tokens.
- **Naming**: the directory was called "the map", but it isn't one. It's now **חברות** (Companies) at `/companies`, everywhere: nav, buttons, numbers, footer, titles. `/map` and `/map/app.html` redirect there (an `#org-id` still opens the company). Its tabs: שאלו / כל החברות / סיגנלים / מעקב.
- **Hero**: craft tiles are icons (Lucide style, one stroke weight, soft purple halo) with short names and a company count; they link to a craft search.
- **One search**: the home search box goes to `/search`, which returns companies and people together, with links to the full lists (`/companies?q=…&craft=…` opens the companies app filtered).
- **People seed**: `/people` starts with the 546 people already published in company records (`key_people`: public business roles with a source). Shown as compact cards marked "ממקורות פומביים", with role, company link, source and date; no contact details, photos or anything inferred. Registered members rank first with a "מאומת" badge. Each listed card has "זה אני" (onboarding prefilled with name, role and company; the profile stores `claimed_from` and replaces the card) and "בקשת הסרה" (no account needed; the card is hidden as soon as the request arrives; the research run then removes the name from the company record). Explained on `/privacy#public`.
- **Copy**: Hebrew rewritten to gender-neutral plural / infinitive, one word per concept (חברות, מאגר, סיגנלים, מעקב).

