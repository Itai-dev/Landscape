# Creative Director: Round 2

## 1. Agree
1. **Researcher:** fetch signals from fixed sources, and add `role_type`, `source` and `as_of` to people. ICE ad-of-the-week credits (agency, production, VP Marketing) are our best source.
2. **UX:** detail sheet v2 with **"Ways in"** in plain language and an action row at the top. This is the pitch moment, and it beats a graph.
3. **Founder:** buyer side first. Every feature has to pass "did it start a real conversation this week?"

## 2. Push back
- **Founder, "studios are context":** referrals come from peers, and studios are half of Ways in. Backfill `reel_url` on the 102 we have rather than adding more.
- **Developer, ungated `db` signals:** one wrong account move embarrasses the user in front of a buyer. Write to `db` as `unreviewed`, have the owner approve each with one tap, and archive to git monthly.
- **Researcher's copy** ("pitch the CEO now"): that's a spammy voice, and it names the wrong person. `why` should be an observation, never an instruction.
- **Me:** the pitch drafter waits until the pipeline and signals prove real. The `work` record waits too; `campaign` signals carry `agency`, `production` and `studio` instead.

## 3. Scope for v2 (in order)
1. **Contracts:** multi-file publish; `signal` and `pipeline` schemas; `contact_url`, `careers_url`, `reel_url` and `role_type`.
2. **Taxonomy facets** in `taxonomy.json`: an alias map from the 75 `creative_needs` variants to about 15, and a Craft/Industry filter sheet.
3. **Detail sheet v2:** Ways in, a private pipeline in `db` (5 statuses plus a follow-up date), and "Export my data".
4. **Signals feed:** seed it with the 13 verified items; owner approval; funding / account move / campaign / marketing head / hiring; Save → pipeline; fade after 60 days.
5. **Lenses (Buyers · Collaborators · All):** cards like `Buys motion · social — via McCann TLV` plus a signal badge.
6. **Token pass:** see vote (f), plus 44px touch targets.

**Waits:** Ask the map, the pitch drafter, the `work` record, a full people layer, onboarding, a Jobs tab, global expansion.

## 4. Votes
- **a. Navigation:** UX's tabs, with my intents as lenses inside Explore. "Find jobs" becomes the Hiring signal type.
- **b. Taxonomy split:** now. It's metadata plus an alias map, no edits to records.
- **c. Credits record type:** later. Carry credits on campaign signals now.
- **d. Signals storage:** `db` plus one-tap owner approval, archived to git monthly.
- **e. Multi-file publish:** now. 1.66 MB inline is too slow on a phone.
- **f. Visual pass:** now, half a day, tokens only:
  - fix the accent/client-blue clash
  - three kind colours instead of six
  - IBM Plex Sans Hebrew.
- **g. Clients → Brands:** yes. To a freelancer, "client" means *my* client.
