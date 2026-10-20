# Researcher: Round 2

## 1. Agree
1. **Founder: put the next 2 runs on the buyer side.** The gaps prove it: no client lists a marketing head, 16 agencies have no website, and GO, Oug, Miyalma and Sporta are missing.
2. **CD: people = commissioning roles, and a controlled `creative_needs` list.** Who-to-pitch can't score 75 free-text variants.
3. **Dev: signal contract** (deterministic id, `org_id` check, unknown orgs queued for discovery). It matches my 13-item sample almost 1:1.

## 2. Push back
- **CD: seeding 50 credits from Effie is a backfill, not v2.** ICE's weekly "ad of the week" gives full credits for free: agency, production, director, client VP Marketing. Store them as `credits` on campaign signals, and promote to a `work` type at about 30.
- **CD: `peak_periods`, `style`, `works_with_freelancers` can't be sourced; we'd be guessing.** `commissioning_roles`, `contact_url` and `careers_url` can, so add those.
- **Founder: 15+ useful signals a week is optimistic.** The test found about 3–5 creative-relevant ones a week outside jobs. Measure signals that led to a pipeline action, not raw volume.
- **Dev: "nothing beyond `key_people`" is too strict.** Adding `role_type` (marketing_head / creative_lead / production_head / founder) plus `source` and `as_of` is a field, not a layer. Otherwise who-to-pitch points at CEOs.
- **Dev: no PR gate on signals is OK** if the weekly research PR carries the git archive, so the owner can review after the fact.

## 3. v2 scope (in order)
1. **Contracts:** signal schema (`date_approx`, optional `credits`), `role_type`/`source`/`as_of` on people, `contact_url`, `careers_url`, a controlled needs list, and the fix for relations that don't resolve (96 of 192).
2. **Signals v1:** feed plus a research step. Seed it with `round1/signals-sample.json`. Types: funding, agency move, rebrand, new marketing head, campaign, hiring.
3. **Pipeline** in `db`, with export.
4. **Brands lens:** needs, agency and latest signal on the card; filter by need.
5. **Multi-file publish.**
6. **Research run:** agencies, production houses, and marketing heads from campaign credits.

**Waits:** Ask-the-map and pitch drafts, the `work` type, tenders (gov.il returns 403), awards (run as a calendar), the full visual pass, Hebrew UI, profiles.

## 4. Votes
- **a.** UX's bottom tabs. CD's intents become lens chips inside Explore. "Find jobs" = the Hiring filter in Signals.
- **b.** Now. The split is mechanical, and who-to-pitch needs it. I'll do it next run.
- **c.** As credits on campaign signals now; as a record type later.
- **d.** Dev's hybrid: live in `db`, archived in git through the weekly PR. A monthly file alone goes stale.
- **e.** Yes, now. It removes the 16 MB ceiling.
- **f.** Fix the blue clash now, because it's a bug. Fonts and palette wait.
- **g.** Yes, "Brands". To a freelancer, "client" means *my* client.
