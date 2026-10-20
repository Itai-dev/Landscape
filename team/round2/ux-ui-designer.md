# UX/UI Designer: Round 2

## 1. Agree
- **CD: four-part pitch sheet** (Why now · Who · Way in · What to show). = sheet order.
- **Founder: the Strauss aha test** (buys, agency, makers, signal on one screen).
- **Developer: one db doc per org in the pipeline, plus Export from day one.** No sync conflicts; beta data protected.

## 2. Push back
- **CD "Find jobs":** we have no job data and the beta isn't job-seekers. Make Hiring a signal chip. CD's verbs become Explore lenses instead.
- **CD credits record type:** too much to build now. Writing ICE credits into `notable_work` + `relations` gets ~80% of the value (Researcher P3).
- **Pipeline stages:** three lists diverge. Use Dev's keys with plain labels: *Watching · To pitch · Contacted · In talks · Client · Passed*, with Passed collapsed.
- **Ask-the-map and pitch drafts wait for v3.** Slow (30–90 s), cost viewer usage, need signals/pipeline data first.
- **Researcher's PR gate on signals:** it delays Monday on the phone. Source + date + one-tap "wrong?" instead.

## 3. v2 scope, in order
1. **Multi-file publish + data contracts** (`schema_version`, signal and pipeline schemas).
2. **Pipeline:**
   - in the sheet: ★ / Stage / Note / Follow-up (+1 wk, +1 mo)
   - a Pipeline tab with "Due" items on top
   - JSON export
3. **Detail sheet v2:**
   - order: actions → Why now → Who → Way in → What they buy
   - Connections as a grouped plain-language list
   - Sources in the footer; 44 px tap targets
4. **Explore lenses: Find work · Find collaborators · All.** Filter by a controlled `creative_needs` list. An inline "I make: [chips]" replaces onboarding.
5. **Signals tab**, seeded from `signals-sample.json`:
   - type chips; items fade after 60 days
   - a "new" dot on cards
   - "Add to pipeline" on each signal
6. **Accessibility and visual fixes:** focus trap, logical CSS, `STR{en,he}`, fix the accent/brand clash, 3 kind colours, Clients → Brands.

**Waits:** AI features, credits type, full Hebrew UI, graph, Jobs, profiles, map, call-sheet look.

## 4. Votes
- **a. Navigation:** bottom tabs (Explore · Signals · Pipeline), with CD's verbs as lenses and no Find jobs.
- **b. Taxonomy:** now, minimal. Split discipline from industry and use ~20 controlled `creative_needs` terms; Find work needs it.
- **c. Credits:** later. Use `notable_work` + `relations` for now; promote at 100+ credits.
- **d. Signals storage:** Dev's option — db live, git archive, no PR gate.
- **e. Multi-file publish:** yes, now. The 1.66 MB inline HTML is slow on phones.
- **f. Visual pass:** partly now — accent clash, 3 colours and Plex Sans Hebrew are cheap. Full look later.
- **g. Rename:** yes, "Brands". Frees "Client" for the pipeline.
