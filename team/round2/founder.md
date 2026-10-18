# Founder — Round 2

## 1. Agree
1. **Researcher: signals from ~8 fixed URLs.** 13 verified in `signals-sample.json`, no search quota. The "why now" behind the aha.
2. **CD: pitch anatomy.** *Why now · Who · Way in · What to show*, with commissioning roles as the people.
3. **Developer: pipeline in the per-user `db`, with Export from day one.** It's our only migration bridge.

## 2. Push back
- **CD, credits record type now:** too big. Use `notable_work` plus campaign signals and promote at 100+ credits.
- **CD, "Find jobs":** we have no job data. Hiring = a signal type (UX is right).
- **Developer, "≤10 Editors":** accepted. The v2 beta is the owner + 5–10 trusted people, not my 25.
- **Researcher, monthly PR gate:** it kills freshness, and signals never edit orgs. Write them to `db` weekly, archive to git, and the owner can hide a bad one.
- **UX, full first-run + Hebrew UI in week 3:** v2 gets only a "my crafts" picker. Hebrew waits until beta users ask for it.
- **Schema-first:** do the minimum (signal schema, pipeline shape, ids never change). `redirects.json` and the people schema wait.

## 3. v2 scope, in order
1. **Pipeline:** 5 statuses, a note and a follow-up date in the `db` user area, plus Export JSON.
2. **Signals feed:** start with the 13 samples; after that the weekly run writes to `db`. Each card gets "Add to pipeline" and fades after 60 days.
3. **Brands lens (who to pitch):** a controlled `creative_needs` list (from the 75 variants) ranked against my crafts. Cards show needs, "via agency" and the latest signal.
4. **Detail sheet v2:** an action row, Why now / Ways in, confidence + `last_verified`, and a one-tap "this is wrong".
5. **Multi-file publish:** dataset and logos as separate files.
6. **Clients → Brands, plus the accent/client-blue fix.**

**Waits:**
- Ask the map
- AI pitch draft (v3, gated per CD)
- Credits type
- Full visual pass
- Hebrew UI
- Jobs
- Profiles
- Going global

## 4. Votes
- **a. Navigation:** UX's tabs. CD's intents become lenses inside Explore (Brands · Collaborators · All); no Jobs until we have data.
- **b. Taxonomy:** `creative_needs` list now (it powers who-to-pitch). Craft vs industry split now too, since it's cheap. Product facet later.
- **c. Credits:** later. Use `notable_work` + campaign signals until 100+.
- **d. Signals storage:** the Developer's way: `db` without a PR gate, archived to git, with an owner hide button.
- **e. Multi-file publish:** now. The page is 1.66 MB today and the `db` work needs it anyway.
- **f. Visual pass:** only the blue fix now. Plex and the three kind colours after beta feedback.
- **g. Clients → Brands:** yes. To a freelancer, "client" means *my* client.
