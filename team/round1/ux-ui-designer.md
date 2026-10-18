# UX/UI Designer — Round 1

## 1. My read of the product today

`site/app.html` is a clean, well-built **catalogue**: search → 7 kind tabs → 3 selects (category, city, sort) → grid of 283 cards → detail sheet. The craft is good: Rubik + Hebrew, dark mode, safe-area insets, `#id` deep links, real logos. But it is **organized by data type, not by job-to-be-done**.

- **The best pitch data is hidden.** `client_profile.creative_needs` (e.g. Max: "animation explainers, motion graphics") and `known_agencies` ("McCann Tel Aviv") only show deep inside the detail sheet. You can't filter on them, and the card doesn't show them.
- **The category select has 60+ options** that mix crafts ("3D animation") with buyer industries ("Banking / finance"). On a phone that's an endless native picker.
- **The detail sheet is a read-only spec sheet.** Description comes first and "Connections" comes near the bottom. Connection reasons are written in dev language ("links here: agency"). There's no Save, no Note, no status.
- **Jobs journey: no data at all.** The schema has no hiring or opening fields. We can't design a Jobs screen yet, only "opportunity signals".
- **Collaborators journey: partly works.** You can filter studios by category and city, but nothing ranks or explains *why* to pick one.
- **No first run.** The masthead says "283 organizations". It doesn't tell a new user what to do.

## 2. What to build next (2–4 weeks), in priority order

**P1: Lenses instead of kind tabs (Explore).** Add a segmented control at the top: **Clients · Collaborators · All**. A lens is a preset filter plus its own card design:
- *Clients lens* (client + agency kinds): the card shows creative needs and "via McCann". Filter by **what they need**, matched to *my* craft.
- *Collaborators lens* (studio, production, startup): the card shows crafts, city, size, and "shares 3 clients with you".
- Split the taxonomy into **Craft** and **Industry**. Replace the 3 selects with one "Filters" sheet plus removable chips for active filters.

**P2: Detail sheet v2, built around action.** Order: identity → **action row (★ Save · Status · Note · Website)** → "Why it fits you" → **Ways in** (agency, studios that worked for them, public leadership) → Signals → Details (collapsed) → Sources (footer). Add a drag handle with two snap points (half and full). Close target ≥ 44px.

**P3: Pipeline (personal CRM).** Five fixed statuses: **Saved → Contacted → In talks → Working · Not now**. Each item can have a note and a follow-up date. Quick follow-up chips: *Tomorrow / 1 wk / 1 mo*. Items due today sit at the top. On a phone this is a list grouped by status, not a kanban.

**P4: Signals feed.** Each card has: type icon · org · one line · date · source · [Save]. Type chips: Funding · Rebrand · New marketing head · Agency move · Hiring. Hiring signals are our honest answer to "find jobs" for now.

**P5: First run (3 taps).** "What do you do?" (craft chips) → "Where?" (city) → "Looking for?" (clients / collaborators / work). This drives the default lens and the "fits you" ranking. It's skippable and can be edited later in ⚙.

**Ask the map** should live **in the search field**, not in its own tab. When the input looks like a question ("who needs 3D for fintech?"), show an "Ask ↵" row. The answer appears as an ordinary filtered list plus one summary line, so the result stays actionable.

## 3. What NOT to do yet, and risks

- **No connection graph.** Only 104 of 283 orgs have `notable_clients` and 124 have `relations`. A graph would be mostly islands, a hairball on a phone, and inaccessible. Use a **grouped list in plain language**: *Their agency · Studios that worked for them · Shares clients with · Part of*. The one graphic worth drawing later is a **path line**: You → Studio X → Max.
- **No Jobs tab** until job data exists. An empty tab costs trust.
- No custom pipeline statuses, kanban drag on mobile, or map view. No profiles or community yet: that's an identity/moderation design problem of its own.
- **Risk: CRM data loss.** The current `localStorage` gets wiped in private mode and doesn't move across devices. The pipeline must live in a per-user `db` area, or users will be burned once and never come back.
- **Risk: stale signals.** Every signal needs a date and a source, and the feed should fade items older than 60 days.

## 4. Cut or simplify now

- Sort: drop "Oldest first" and "Recently verified" (internal; every record says 2026-10-18). Keep **Best fit · A–Z · Newest**.
- "Reset" link → a "Clear all" chip at the end of the active-filter chips.
- Cards: 2-line description, at most 2 chips. Remove the masthead tagline on mobile.
- "Other relations" merges into Connections. The confidence badge moves to the Sources footer.

## 5. Accessibility and Hebrew/RTL

- Touch targets ≥ 44px (today the `.close` button is 34px and chips are about 22px tall). Labels at least 12px (`.kind` is 11px).
- Sheet: trap focus, make the background `inert`, return focus to the card that opened it. Announce the result count with `aria-live="polite"`.
- Status and kind must never rely on color alone: always pair them with a text label or icon.
- **RTL-ready CSS now:** logical properties (`padding-inline-start`, `text-align: start` instead of the current `text-align:left` / `padding-left`). Wrap mixed Hebrew/English names in `<bdi>`, and put `dir="auto"` on user notes. Mirror chevrons and tab order, not logos.
- Move all UI strings into one `STR = {en, he}` table now. Ship English first, add Hebrew in week 3 or 4. Format dates as he-IL when the UI is in Hebrew.
- Search: only 131 of 283 orgs have `name_he`. Show "No Hebrew name — try English" as a hint instead of an empty result.

## 6. Empty states

- Pipeline, empty: "Star a company to start your pipeline", with a button to the Clients lens.
- Signals, empty: "Next research run: Sunday. You'll see funding, rebrands and hires here."
- Search, no results: offer "Ask the map instead", plus the active filter chips so the user can remove them.

## 7. Decisions for the team (with my recommendation)

1. **Navigation:** 3 bottom tabs (**Explore · Signals · Pipeline**), with Ask living in search. *Yes.* Add Profile as a 4th tab only when community ships.
2. **Explore by intent lens, not by kind.** *Yes.* Kind becomes a secondary filter.
3. **Connections:** a grouped plain-language list in v1, no graph. *Yes.*
4. **Pipeline statuses:** 5 fixed, not user-defined, stored in the `db` user area (not `localStorage`). *Yes.*
5. **Jobs:** no Jobs tab. Add "Hiring" as a signal type, and add an optional `hiring` field to the research schema. *Yes.*

---

## Wireframes (phone, about 360px wide)

**A. Explore, Clients lens**
```
┌──────────────────────────────────┐
│ 🔍 Search or ask…                │
│ [Clients●][Collaborators][All]   │
│ Needs: Motion ✕  Tel Aviv ✕  ⚙ Filters
│ 41 fit you · Best fit ▾          │
├──────────────────────────────────┤
│ [MX] Max · Bnei Brak        ☆    │
│ Needs: motion, explainers, social│
│ Agency: McCann TLV · 2 signals   │
├──────────────────────────────────┤
│ [LG] Bank Leumi …           ★    │
└──────────────────────────────────┘
│  Explore  │  Signals •3 │ Pipeline │
```

**B. Detail sheet (half snap → full)**
```
          ───  (drag handle)
[logo] Max  מקס             [✕ 44px]
Client · Payments · Bnei Brak
[★ Saved][Status: Contacted ▾][✎ Note][↗ Site]
WHY IT FITS YOU
  Needs motion graphics + explainers
WAYS IN
  Their agency ……… McCann Tel Aviv  ›
  Worked for them … Studio X, Y     ›
  Part of ……………… Clal Holdings      ›
SIGNALS
  ● Skymax launch campaign · Globes · Jun
▸ Details (services, work, funding)
▸ Sources · high confidence · 4 links
```

**C. Pipeline**
```
Pipeline                     [All ▾]
DUE TODAY (2)
  Max · follow up · "sent reel" [Done][+1wk]
CONTACTED (5) ▾
  Wix · 3 d ago                  ›
IN TALKS (1) ▾   WORKING (2) ▸   NOT NOW ▸
```

**D. Signals**
```
[All][Funding][Rebrand][People][Hiring]
💰 Startup X raised $12M · Calcalist · 2d  [☆]
👤 Brand Y new CMO · LinkedIn · 5d        [☆]
🧑‍💻 Studio Z hiring 3D generalist · 1w     [☆]
— older than 60 days, faded —
```

**E. First run**
```
What do you do?   (pick any)
[Motion][2D][3D][VFX][Design][Sound][Producer]
Where?  [Tel Aviv ▾]
Looking for  [Clients][Collaborators][Work]
              [Start →]   Skip
```
