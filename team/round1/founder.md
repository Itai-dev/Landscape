# Founder memo — Round 1

## 1. Honest read
- **A good directory, not a product yet.** 283 sourced Israeli orgs. Search/filters answer "who exists?", not "who do I pitch this week, and why now?" Nobody, owner included, has a reason to open it on a Tuesday.
- **The value is the buyer side, and it's thin.** 55 clients + 31 agencies; 78 `client_profile`, 124 with `relations`. Records like `strauss-group.json` (needs, current agencies, Effie win) *are* the product; the 102 studios are context.
- **No feedback loop.** Research ships weekly PRs, but we don't know if any record ever produced an email or a meeting.

## 2. Users, job, aha
- **User #1 = the owner**, a senior creative who sells their own work. Test for every feature: *did it start a real conversation this week?*
- **Beta (20–50):** senior freelancers and leads of 2–15-person studios (motion, 3D, animation, VFX/post, sound, illustration) in Israel. They sell to agencies/brands and have no biz-dev person. **Not** students or job-seekers: different job, and FB groups already do it.
- **The job:** "When my pipeline goes quiet, show me who buys what I make, the route in, and a reason to reach out *now*."
- **Aha:** open Strauss and see on one screen what they buy, their agency, which studios did their work, plus a fresh signal ("new CMO"). The thought: *"I know who to email this week."*

## 3. Positioning
| | Is | Our gap |
|---|---|---|
| LinkedIn | people + noise | no view of who buys from whom |
| Behance | portfolios for peers | nothing about buyers |
| Clutch | reviews for buyers | serves the buyer, not the maker |
| Fiverr | buyers come to you | race to the bottom, no outbound |
| FB/WhatsApp groups | word-of-mouth gigs | gone in a day, no search, no context |

**Landscape = market intelligence for the people who make the work:** who buys, who makes, who's connected, what changed this week. A "Crunchbase + CRM for creative sellers." We're on the seller's side and never sell creatives' data to buyers.

## 4. Next 2–4 weeks
1. **Personal pipeline on each org.** Status (watching → to pitch → contacted → talking → client), a note, a follow-up date, kept private in `db`. This makes it a weekly habit.
2. **"Who to pitch" view.** Clients/agencies ranked by `creative_needs` × my disciplines × signal freshness. First grow the buyer side to about 120 records with known agencies; that beats adding more studios.
3. **Signals v1.** The weekly run also writes 10–20 dated, sourced signals linked to orgs (funding, rebrand, new marketing head, agency switch), each with one button: "add to pipeline".
4. **Draft-a-pitch (`sample`)** from org + signal + my profile. Full "ask the map" comes later.

## 5. Not yet / risks
**Not yet:** public sign-up, community/profiles, own stack, job board (cold start; FB wins), world expansion, reviews, pricing. People layer = public leadership only (we already have `key_people`). No personal contact details: Israel's Privacy Law Amendment 13 makes that a real risk.

**Risks:**
- **Arming the owner's competitors.** If 50 motion designers share one pitch list, the owner loses their edge. Mix disciplines in the beta and keep pipelines strictly private.
- **Wrong data costs trust.** Show `confidence` and `last_verified` in the UI, and add a one-tap "this is wrong".
- **Login friction.** Artifact viewers need a claude.ai sign-in plus an invite. Fine for 30 people, not for public.
- **The research engine becomes the hobby.** Record counts grow while nobody pitches.

## 6. Success
**30 days (owner):**
- Opens it 3+×/week
- 10+ outreaches that started in Landscape, 1+ meeting
- 15+ signals/week, 30%+ added to pipeline
- 120+ buyer records

**90 days (beta):**
- 30 active users, 40%+ still active in week 4
- 5+ say "got a meeting/project via Landscape"
- 20+ user corrections
- 40%+ "very disappointed" if it went away

**North star:** pipeline actions per active user per week.

## 7. Business model (later, lightly)
Options in order:
1. **Pro** for freelancers (signals + pipeline + AI, ~₪49–99/mo)
2. **Studio team plans**
3. **Sponsored industry reports** ("State of Israeli Motion 2027")
4. **Job-post fees**, once a community exists

No charging before the 90-day retention numbers are in.

## 8. Name check: "Landscape"
- **+** Says "map of the field"; calm and grown-up; easy in Hebrew and English.
- **−** Generic and hard to Google. Collides with landscape architecture, "landscape mode" and Canonical's *Landscape* (an Ubuntu product). The .com is surely taken.
- **Verdict:** working name through the beta. Before going public, check trademark and domain and test an ownable form ("Landscape — the creative industry map") or a new name.

## 9. Decisions (my recommendation)
1. **Beta cohort:** ~25 hand-picked senior freelancers and studio leads, mixed disciplines, invited in week 4.
2. **Build order:** pipeline + who-to-pitch, then signals, then AI pitch. Profiles wait.
3. **Research focus:** the next 2 runs go to the buyer side (clients, agencies, current agency links, marketing leads), not more studios.
4. **Platform:** stay on the Artifact (`db` + `user` + `sample`) through the beta. Revisit Vercel + Postgres + auth only once week-4 retention passes 40% and we need public profiles.
5. **Privacy line:** the shared map is public business info. Pipelines, notes and drafts are private by default and never aggregated without opt-in.
