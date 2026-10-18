# Developer — Round 2

## 1. Agree
- **Founder:** build pipeline → who-to-pitch → signals → AI pitch; research goes to the buyer side next. Draft-a-pitch (plain `sample`, no tools) before Ask-the-map: cheaper, clearer payoff.
- **Researcher:** fetch ~8 fixed source pages instead of using the search quota. Add `contact_url`, `careers_url`, `key_people[].{role_type,source,as_of}` before the next run.
- **UX:** 3 tabs, Ask in search, 5 fixed statuses in `db`, connections as a grouped list (no graph).

## 2. Push back
- **CD, `signals[]` inside org records:** no. Keep them as separate records with an `org_id`. Embedding churns org files and can't hold orgs we don't have yet (5 of the 13 in the sample).
- **CD, ~12 new fields:** take 4 now (`contact_url`, `careers_url`, `reel_url`, people fields). The rest wait until research can fill them.
- **CD, "Find jobs":** we have no job data. Use a Hiring filter in Signals instead.
- **UX, first-run wizard, snap points, full `STR{en,he}` table:** not v2. A "My crafts" chip row in the Brands lens is enough. Logical CSS properties now, since they're cheap.
- **Founder, "this is wrong":** it needs its own `db` rule (owner reads, each user writes their own). Comes in v2.1.
- **Me:** I'm dropping "signals in db, no PR gate". See (d).

## 3. v2 scope (in order)
1. **Contracts:** `signal.schema.json` (Researcher's fields + `id`, `org_id`, `date_approx`), the 4 org fields, a `facet` on each taxonomy slug, `needs[]` slugs normalised from `creative_needs`, `schema_version`, `redirects.json`. Ingest the 13 sample signals.
2. **Multi-file publish:** `dataset.json` + `signals.json` + `logos.json`, replacing the 1.66 MB inline HTML.
3. **Shell:** Explore (Brands · Collaborators · All) · Signals · Pipeline. Rename Brands in the UI; fix the accent clash.
4. **Pipeline:** status / note / follow-up on the detail sheet, stored per user in `db`, plus "Export my data".
5. **Signals:** a tab, signals on each org's sheet, Save to pipeline, fade after 60 days.
6. **Best fit:** rank by `needs` ∩ my crafts + signal freshness + agency route.

**Waits:** draft-a-pitch (first item of the next session), Ask-the-map, credits, Hebrew UI, wizard, font, reels, `db` signal mirror, own backend.

## 4. Votes
- **a.** UX's tabs. CD's intents become lenses inside Explore; jobs become the Hiring filter.
- **b.** Now, the light version: a facet tag per slug + `needs[]`. Best fit depends on it.
- **c.** Later. `notable_work` + relations until we have ~50 credits.
- **d.** Researcher's: a monthly repo file via PR, published with the page. Git stays the one record. Mirror to `db` only if merge lag hurts.
- **e.** Yes, now. Same `fetch` on Pages and the Artifact.
- **f.** Partly: kind colours + accent fix now (tokens only); the Plex Hebrew font with the Hebrew UI.
- **g.** Yes, in the UI. `kind: "client"` stays in the data.
