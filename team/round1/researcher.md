# Researcher memo — Round 1

## 1. Honest read of the data today
**Accurate but flat. It's a directory, not a lead list yet.** I spot-checked 10 records against this week's news. All were correct, and some already include October news (`loreal-israel`, `adler-chomski-warshavsky`, `gitam-bbdo`). The weak spots are structural:

- **No way in.** The schema has no contact or careers field: no `contact_url`, `careers_url`, or email. Only 26% of records have `links`, and only 40 have a LinkedIn link. This matters most for getting work.
- **People don't match who hires.** `key_people` holds 320 people, but they are almost all founders and CEOs ("Co-founder" 94, "Co-founder & CEO" 45). Of 55 client brands, **none** lists a marketing head. Strauss shows only "Chairwoman".
- **Agency records are thin.** 16 of 31 agencies have no website, including Yehoshua TBWA, Publicis TLV and Leo Burnett. Agency → client links depend on press snippets.
- **Production credits are missing.** `notable_work` is at 21%. We don't record who made which ad, even though ICE's "ad of the week" prints full credits.
- **Freshness is untested.** All 283 records have `last_verified: 2026-10-18`. 28 records have a single source, 13 are sourced only from their own website, and 16 are `low` confidence (e.g. `ikea-israel`, `moveo-group`).
- **Coverage holes from this week's test:** GO (agency), Oug and Miyalma (production), Sporta Digital (branding), studio T (AI studio), and Delek Israel (fuel). That last one could be confused with `delek-motors`, a different company.

## 2. Signals: what's feasible weekly (tested 2026-10-18)
| Signal | Best sources | Weekly reliability | Notes |
|---|---|---|---|
| Funding rounds | geektime.co.il/category/funding (Hebrew; **geektime.com is "under construction"**), en.globes.co.il front page, CTech "Full list of 2026 rounds" | **High** (fetch works) | About 90% is cyber or infra. We need a filter: "came out of stealth" or consumer/creative-tech = needs a launch film. |
| Agency account moves / ownership | **Globes tag `משרדי_פרסום`** (dated, 117 pages), ice.co.il/advertising-marketing | **High** | Best ROI: about 1–3 real moves a month. WebSearch misses them, so fetch the tag pages directly. |
| Campaign launches + credits | ICE "פרסומת השבוע", Globes marketing | **High** | Credits name the agency, production co, director and the client's marketing VP. This is gold for the people layer. |
| Rebrands | ICE, Globes, Portfolio (prtfl.co.il) | Medium | Irregular. Example: Diamond Exchange / Sporta Digital (Oct 18). |
| New CMOs / marketing heads | ICE "Supermarketing" profiles, Globes appointments, campaign credits | Medium | Few announcements are explicit; credits and profiles are the real source. |
| Job posts | LinkedIn public job search (server-rendered, **works**), AllJobs (works, noisy), Drushim (works, very noisy) | **High** volume | LinkedIn shows only relative dates ("3 weeks ago"). Store a link plus a summary, never bulk copies. |
| Tenders | mr.gov.il (fetch works but its search is JS-only), gov.il tender collector (**403**), Wizbiz (paid) | **Low** | Needs a small scraper or the owner's paid feed. Defer. |
| Festivals / awards | Effie Israel (April), Animix (Aug 4–8, winners not indexed), Kipod Zahav, Cannes shortlists | Seasonal | Run it as a calendar, not a weekly job. |

**Ethical line:** public business facts only (who raised, who won an account, who made an ad, what a company is hiring for). Always link the source and paraphrase. Keep a source URL plus a one-line summary per signal. No scraping behind logins, no bulk copies of LinkedIn content, no personal data. Political campaigns are a grey zone: skip them or tag them neutral.

**Test result:** `team/round1/signals-sample.json` holds **13 verified signals** from the last 60 days. Each was read on its source page and 10 match existing org ids. They span funding, account moves, a rebrand, campaigns with credits, a new marketing head and jobs. A weekly run of ~8 fixed URLs is cheap and does not depend on the search quota.

## 3. People layer: where the line is
- **OK:** a named person in a **publicly announced business role**, tied to a source. Examples: VP Marketing quoted in a press release, an ICE campaign credit ("Keren Kuperminc, Deputy CEO & VP Marketing, Delek Israel"), an agency CCO, an Head of Production on the company site. Store `{name, role, role_type, source_url, as_of}` so a "who to pitch" view can filter by role type.
- **Not OK:** personal emails or phones, home cities, scraped LinkedIn profiles, inferred job changes, and junior staff from credit lists. Don't store them, even if they're public.
- **Sourcing:** campaign credit blocks (ICE/Globes) cover clients and agencies, company "team" pages cover studios, and funding press covers startups. The record links out to the person's public LinkedIn; it does not copy it.

## 4. What to build next (research side, 2–4 weeks)
1. **Signals file + weekly fetch** (`data/signals/YYYY-MM.json`, the schema used in the sample). The Sunday run fetches the 8 source pages and appends verified items linked to org ids. Highest value for the lowest cost.
2. **Schema adds:** `contact_url`, `careers_url`, `links.linkedin` (backfill for all orgs), and `key_people[].{role_type, source, as_of}`.
3. **Credits ingest:** for each "ad of the week", add `notable_work` with agency/production/director relations. This builds the client ↔ agency ↔ studio graph behind "connections".
4. **Gap segment:** an agencies + production houses refill (GO, Oug, Miyalma, Sporta, studio T, plus the 16 agencies without websites) before more studios.

## 5. Don't do yet
- **Tenders automation** (blocked or paid) or an inbox of every job post (too noisy; most are in-house roles).
- **Global segments.** Israel's client side is still thin.
- **A people layer before** sourcing and role-type rules exist. It's the easiest place to cross the privacy line.

## 6. Decisions for the team
1. **Signals live in the git repo as JSON (reviewed via PR), mirrored to the Artifact `db`?** → Yes. Git is the record, and the db is only for display/state.
2. **Which signal types for v1?** → Funding (filtered), account moves, campaign credits, marketing heads and job posts. Defer tenders and awards.
3. **People rule?** → Public business role + source + date only, and only marketing, creative or production leads and founders.
4. **Signal expiry?** → Show signals for 60 days, keep them archived. Approximate dates (LinkedIn) get `date_approx: true`.
5. **Fix the schema before the next research run?** → Yes. Add contact/careers/role_type first, otherwise each run adds more records we can't act on.
