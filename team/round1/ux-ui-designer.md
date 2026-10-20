# UX/UI Designer — Round 1

## 1. My read of the product today

`site/app.html` is a clean **catalogue**: search → 7 kind tabs → 3 selects → 283 cards → detail sheet. The craft is good: Rubik + Hebrew, dark mode, `#id` deep links, logos. But it is **organized by data type, not by the job the user is trying to do**.

- **The best pitch data is hidden.** `creative_needs` (Max: "animation explainers, motion graphics") and `known_agencies` ("McCann Tel Aviv") appear only in the sheet. You can't filter on them, and they're not on the cards.
- **The category select has 60+ options** that mix crafts ("3D animation") with buyer industries ("Banking"). On a phone that's an endless native picker.
- **The sheet is read-only.** Connections sit near the bottom, explained in dev language ("links here: agency"). There's no Save, Note or status.
- **Jobs: no data** (the schema has no hiring fields). **Collaborators: partly works.** You can filter, but nothing ranks results or explains *why*. **No first run.**

## 2. Build next (2–4 weeks), in priority order

**P1: Lenses instead of kind tabs (Explore).** Add a segmented control: **Clients · Collaborators · All**. Each lens = preset filters + its own card design.
- *Clients* card: creative needs + "via McCann". Filter by **what they need**, matched to *my* craft.
- *Collaborators* card: crafts, city, size, "shares 3 clients with you".
- Split the taxonomy into **Craft** and **Industry**. Replace the 3 selects with one "Filters" sheet plus removable chips.

**P2: Detail sheet v2, built around action.** Order: identity → **action row (★ Save · Status · Note · Website)** → "Why it fits you" → **Ways in** (their agency, studios that worked for them, public leadership) → Signals → Details (collapsed) → Sources (footer). Add a drag handle with half/full snap points.

**P3: Pipeline (personal CRM).** Five fixed statuses: **Saved → Contacted → In talks → Working · Not now**. Each item has a note and a follow-up date. Quick-pick chips: *Tomorrow / 1 wk / 1 mo*. Items due today sit at the top. On a phone it's a grouped list, not a kanban.

**P4: Signals feed.** Each card: type icon · org · one line · date · source · [Save]. Type chips: Funding · Rebrand · New marketing head · Agency move · **Hiring**. Hiring signals are our honest answer to "find jobs" for now.

**P5: First run (3 taps).** Craft chips → city → looking for (clients / collaborators / work). This sets the default lens and the "fits you" ranking. It can be skipped.

**Ask the map** should live **in the search field**, not in its own tab. When the input is a question ("who needs 3D for fintech?"), show an "Ask ↵" row. The answer appears as an ordinary filtered list plus one summary line, so the result stays actionable.

## 3. Not yet, and risks

- **No connection graph.** Only 104 of 283 orgs have `notable_clients`. On a phone a graph becomes islands and hairballs, and it's inaccessible. Use a **grouped list in plain language**: *Their agency · Worked for them · Shares clients · Part of*. Later, maybe a **path line**: "You → Studio X → Max".
- **No Jobs tab** until job data exists. An empty tab costs trust.
- No custom statuses, kanban drag, map view, or profiles/community yet.
- **Risk: losing CRM data.** `localStorage` doesn't survive private mode or move across devices. The pipeline must live in the per-user `db` area.
- **Risk: stale signals.** Every signal needs a date and a source. Fade items older than 60 days.

## 4. Cut or simplify now

- Sort: drop "Oldest first" and "Recently verified" (every record is dated 2026-10-18). Keep **Best fit · A–Z · Newest**. Replace the "Reset" link with a "Clear all" chip.
- Cards: 2-line description, at most 2 chips. Merge "Other relations" into Connections. Move the confidence badge to the Sources footer.

## 5. Accessibility and Hebrew/RTL

- Touch targets ≥ 44px (`.close` is 34px today; chips are about 22px). Labels at least 12px (`.kind` is 11px). Status and kind are never shown by color alone.
- Sheet: trap focus, make the background `inert`, return focus to the card that opened it. Announce the result count with `aria-live`.
- **Make the CSS RTL-ready now.** Use logical properties (today it uses `text-align:left` and `padding-left`). Wrap mixed Hebrew/English names in `<bdi>`, and put `dir="auto"` on notes. Mirror chevrons and tab order, but not logos.
- Put all UI strings in one `STR = {en, he}` table now. Ship the Hebrew UI in week 3 or 4. Only 131 of 283 orgs have `name_he`, so show a "try English" hint instead of empty results.

## 6. Empty states

- Pipeline: "Star a company to start", with a link to the Clients lens.
- Signals: "Next research run: Sunday."
- Search with no results: offer "Ask the map instead", plus the active filter chips so the user can remove them.

## 7. Decisions for the team (my recommendation)

1. **Navigation:** 3 bottom tabs (**Explore · Signals · Pipeline**), with Ask inside search. *Yes.* Add Profile as a 4th tab only when community ships.
2. **Explore by intent lens**, with kind as a secondary filter. *Yes.*
3. **Connections:** a grouped plain-language list in v1, no graph. *Yes.*
4. **Pipeline:** 5 fixed statuses, stored in the `db` user area (not `localStorage`). *Yes.*
5. **Jobs:** no tab. Add a "Hiring" signal type and an optional `hiring` field in the research schema. *Yes.*

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
