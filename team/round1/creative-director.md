# Creative Director: Round 1

## 1. Where the product stands

**Serious data that still reads like a directory.** `connections()` in `site/app.html` already finds shared clients. That's the referral graph, which is how most of us get work. The gaps:

- **Taxonomy mixes three lists into one.** `schema/taxonomy.json` puts "2D animation", "Telecom" and "Website builders" in one dropdown. Creatives filter by *what I make*, then *who buys it*: separate facets for discipline, industry and product.
- **`creative_needs` has 75 free-text variants** ("motion graphics" and "motion design"; "tv commercials" and "tv/commercial production"). So "who needs 3D?" is unanswerable.
- **The people listed are the wrong people.** `gitam-bbdo.json` lists its Chairman and CEO. Animation at an agency is commissioned by the **Head of Production or agency producer**, and at a brand by the Head of Brand or Content.
- **No reels.** Across 283 records there are 7 Vimeo links and 4 Behance links. The reel is our currency.
- **Signals are hidden in `notes`.** "Hapoalim ended BBR, Jul 2025" (`bank-hapoalim.json`). "Lotto moved to Adler Chomski, Feb 2026" (`bbr-saatchi-saatchi.json`). These are the best "why now" we have.
- **One `kind` per org hides buyers.** Wix is a `startup` with no `client_profile`, yet it's a major buyer of motion work. Only 3 orgs are flagged `in_house_studio`.

## 2. What to build next (2–4 weeks, in priority order)

1. **Three entry points instead of six type tabs:** *Find work* (brands, agencies, production companies), *Find collaborators* (studios, freelancers), *Find jobs* (orgs hiring now).
2. **Credits as a record type.** `work`: `{title, year, brand, agency, production, studio, url, award}`. The brand → agency → production → studio chain is the most valuable data in advertising. It answers "who made this" and shows warm paths. Seed about 50 Israeli campaigns from Effie Israel and agency case studies.
3. **New fields.** All public, sourced and dated:
   - *Buyers:* `buying_route` (agency / direct / in-house / via production co), `commissioning_roles` (public names and roles), `peak_periods` (Rosh Hashana, Pesach, back-to-school, Q4 for global tech; briefs land 6–8 weeks before), `buys_creative` (separate from `kind`).
   - *Studios:* `reel_url`, `style` (character, cel 2D, stylized 3D, photoreal, mixed media, kinetic type), `works_with_freelancers`, `careers_url`, `contact_url` (a company page, never a personal email).
   - *Everyone:* `signals[]`, each `{date, type, summary, source}`. Types: account move, new marketing head, funding, rebrand, launch, hiring.
   4. **Card copy that answers what, for whom and why now:**
   - Studio: `3D · CGI · Product films — for Google, Playtika, monday.com` plus a reel thumbnail.
   - Brand: `Buys TV · social · motion — via Gitam BBDO` plus `Agency change · Jul 2025`.
   - Rename **Clients → Brands**. To a freelancer, "client" means *my* client.
5. **A disciplined pitch helper** (`sample` + `db`). See section 4.

## 3. What not to do yet, and the risks

- **No public community.** Profiles come later, built on credits, not followers.
- **No scraped personal emails, no bulk sending.** Israel is tiny; producers talk.
- **Accuracy is a brand risk.** Telling Hapoalim "I see you work with BBR" embarrasses the user. Agency links need `as_of`, and anything older than 12 months gets flagged.
- **No "AI-powered" or "leads" language.** Creatives are wary right now (`artlist.json`: AI pivot, 200 layoffs).
- **No going global** until the Israeli buyer side is dense. No naming exercise yet.

## 4. The pitch moment

A great outreach:

- goes to the **right person** (producer or Head of Brand, not the CEO)
- arrives at the **right moment**: new CMO, rebrand, funding, agency switch, or 6–8 weeks before a holiday
- references **one specific piece** of their recent work
- shows **one relevant piece of mine**, not the whole reel
- makes a **small ask**
- stays **under 120 words**, with one follow-up after 2 weeks, then stop.

The detail sheet should line these up as four parts:

- **Why now:** the signal.
- **Who:** the commissioning role.
- **Way in:** the warm path, e.g. "you both worked for SodaStream".
- **What to show:** my work matched to their `creative_needs`.

Draft rules:

- One draft at a time, in Hebrew or English.
- It won't draft without a "why now" and a chosen work sample.
- It never sends.
- It logs to the pipeline with one follow-up reminder.

## 5. Brand direction

- **Name:** keep *Landscape* for the beta. It's generic and hard to own in search; revisit before public launch.
- **Tagline:** "Who makes what, for whom. Israel's creative industry, mapped."
- **Voice:** insider, terse, like credits. Dates and sources, no hype.
- **Visual:**
  - The palette is Tailwind-default (orange/fuchsia/teal/amber/blue-700) and reads like SaaS.
  - It has a bug: `--accent #1640c9` and `--k-client #1d4ed8` are almost the same blue, so links look like clients.
  - **Direction: "call sheet / end credits".** Ink on paper, one signal colour for *why now*, three kind colours (Buyers / Makers / Tools) instead of six.
  - **Type:** IBM Plex Sans Hebrew alongside the Plex Mono we already use, with mono for credit lines (`AGENCY · PROD · STUDIO`).
  - **The work leads:** reel thumbnails via oEmbed, linking out. A 1–2 day pass.

## 6. Decisions for the team (my answer: yes to all)

1. **Facet the taxonomy and control `creative_needs`.** This week.
2. **Add the `work` (credits) record type.** Seed about 50 campaigns.
3. **People layer = commissioning roles.** Public, sourced, `as_of`, no personal contact details.
4. **Pitch helper v1:** gated drafts, no sending, no bulk.
5. **Find work / collaborators / jobs navigation and Clients → Brands**, shipped with the brand pass.
