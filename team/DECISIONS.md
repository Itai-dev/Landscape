# Team decisions — v2

_2026-10-18 · Founder, Creative Director, UX/UI Designer, Developer, Researcher · memos in `round1/` and `round2/`_

## What v2 is for
One job: **"When my pipeline goes quiet, show me who buys what I make, the way in, and a reason to reach out now."**
User #1 is the owner; then a small invited beta (owner + 5–10 trusted creatives). Every feature must pass the test:
*did it start a real conversation this week?*

## Decisions

| # | Question | Decision | Vote |
|---|---|---|---|
| 1 | Navigation | Bottom tabs **Explore · Signals · Pipeline**. Inside Explore, lenses **Brands · Collaborators · All**. "Ask" will live in the search field (v3). | 5–0 |
| 2 | Jobs | No Jobs tab without data. **Hiring** is a signal type with its own filter. | 5–0 |
| 3 | "Clients" → **"Brands"** | In the UI only; `kind: "client"` stays in the data so the contract is stable. "Client" becomes a pipeline stage. | 5–0 |
| 4 | Taxonomy | Light split now: each category slug gets a **facet** (craft / industry / product / agency). Free-text `creative_needs` map to a **controlled needs list** via an alias file — no record edits. | 5–0 |
| 5 | Pipeline | Private per person (Artifact `db`, `data/users/<id>/`). Stages: **Watching · To pitch · Contacted · In talks · Client · Passed**, plus note and follow-up date. **Export my data** ships with it. | 5–0 |
| 6 | Signals storage | **Split vote** (db-live: Founder, UX, Researcher; db + owner approval: CD; git via PR: Developer). **Decision:** signals are their own records (never inside org files), archived in git (`data/signals/`) and published with the page; the weekly run also writes them live to the app database when it can. Every signal shows date + source; the owner can **hide** a bad one with one tap. | 3–1–1 |
| 7 | Packaging | Stop inlining everything into one 1.66 MB page. Publish **page + dataset + signals + logos** as separate files. | 5–0 |
| 8 | Visual | Now: fix the accent/brand-blue clash, reduce type colours to **3 groups** (makers · tech · buyers), 44px touch targets. Later: font change and the full "call sheet" look. | 3–2 |
| 9 | Credits ("who made which ad") | Later as a record type (at ~50–100 credits). For now campaign signals carry agency / production / studio. | 5–0 |
| 10 | People | Only publicly announced business roles; add `role_type`, `source`, `as_of`. Prioritise people who *commission* work (heads of production, agency producers, marketing heads) — next buyer-side research run. No personal contact details, ever. | 5–0 |
| 11 | Fields now | `contact_url`, `careers_url`, `reel_url`, people `role_type/source/as_of`. Others (peak periods, style…) wait until research can source them. | 4–1 |
| 12 | Platform | Stay on the claude.ai Artifact for the beta. Own stack (Vercel + Postgres + auth) only when public profiles / community are needed. Ids never change; `data/redirects.json` for merges. | 5–0 |

## v2 build scope (this session)
1. Data contracts: signal schema + the 13 verified sample signals, taxonomy facets, needs list + alias map, new optional fields, `schema_version`.
2. Multi-file publish.
3. App shell: bottom tabs, lenses, filter sheet (Craft / Industry), "I make" craft picker, Brands rename, colour fixes.
4. Detail sheet v2: action row (save · stage · note · follow-up), **Why now** (signals), **What they buy**, **Ways in** (grouped connections), details folded.
5. Pipeline tab (due first, grouped by stage, export).
6. Signals tab (type filters incl. Hiring, add to pipeline, fade after 60 days, owner hide).
7. **Best fit** ranking: needs ∩ my crafts + recent signals + an agency route.

## Shipped after v2
- **Pitch draft** (v3): Why now (a signal or your own reason, required) · Who (marketing/production people first, then the agency route) · About you · What to show (one work sample, required) · English/Hebrew. Drafts only; the person edits and sends it themselves. Saving a draft sets one follow-up in a week.
- **Report a mistake**: goes to a private `reports` area only the owner (and research runs) can read.

- **Ask the map** (search field → "Ask ✦", or Enter on a question): Claude answers from the map only, using page tools (search_orgs, get_org, recent_signals, my_pipeline) and lists the companies it used as tappable cards.
- **Hebrew UI**: full English/Hebrew string table, right-to-left layout, Hebrew labels for every category and need, Hebrew names first in Hebrew mode. Record descriptions stay English (as sourced).

- **AI-first home** (owner feedback: "a database feels old-fashioned"): the app now opens on a single prompt — "What are you looking for?" — with suggested questions based on your crafts and a "This week" strip of signals. Answers come back as a short summary plus result cards (why it fits · what they buy · Save · Pitch · Open) and follow-up questions; live steps show what's being checked. Browse (the old directory) is the second tab. Without Claude (e.g. GitHub Pages) it falls back to keyword matches.

## Waits (in rough order)
v3: AI pitch draft (Why now · Who · Way in · What to show; drafts only, never sends) → Ask the map → "this is wrong" reports → credits type → Hebrew UI → onboarding → profiles & community on our own stack → world.

## Next research runs
1. Buyer side: commissioning people, contact/careers pages, agency websites, more brands (target ~120 buyer records).
2. Signals from ~8 fixed source pages (Globes ad-agency tag, ICE ad-of-the-week, Geektime funding, CTech, LinkedIn jobs…).
3. Reel links for the 102 studios.

## Community v1 (own stack, free tiers)
Owner brief: profiles anyone can see, onboarding that fills itself from LinkedIn / portfolio / CV with a questionnaire fallback, email sign-up that builds a mailing list, find people (not only companies), newsletter at a chosen frequency.
- **Stack**: Next.js app at the repo root on Vercel; Supabase (Postgres, email magic-link auth) through the Vercel Marketplace integration; Claude API for the profile draft. The map app keeps living at `/map` (copied from `site/` at build).
- **Onboarding** (`/onboard`): any of CV/LinkedIn PDF, portfolio link, or free text → AI draft → questions **only** for missing required fields (name, headline, crafts, city, open to) + visibility + newsletter → full review with AI-filled fields marked → saved only on approval. "No sources" goes straight to the questionnaire; any AI failure falls back to it too.
- **LinkedIn**: scraping is blocked and against its terms, so we ask for the "Save to PDF" export and only store a LinkedIn URL as a link.
- **Privacy** (Israeli Privacy Protection Amendment 13 + anti-spam law): newsletter opt-in is an unchecked box; consent time + wording are stored; visibility per profile (public / members / hidden, default members); no emails or phones on profiles (stripped from AI output too); CV kept only if the person ticks a box, in a private bucket; delete-account button removes everything. Contact between people will go through the platform later.
- **Schema**: `profiles`, `newsletter_prefs` with RLS (owner writes; public rows to everyone; members rows to signed-in users). Migration is idempotent and runs on every Vercel build when the database URL is present.
- **Graceful without config**: with no env vars the site builds and shows "בקרוב" notices instead of sign-up.
- Next: people search with AI across people + companies, newsletter sending (Resend), contact requests, Hebrew-name slugs.

## Visual design v2 (owner: "Dribbble's look, with Simply's purple") (look superseded by v3)
- **Look** (replaced by v3 below): white canvas, deep-purple ink, dark pill primary buttons, soft grey pill search with a round accent button, outlined pill tags, image-first people cards. The accent colour and type below still hold.
- **Colour**: one accent, Simply's `--color-primary-purple-haze` `#8217ff` (from hellosimply.com's CSS); ink is Simply's deep purple `#110034`. Both pass WCAG AA on white. Org-group colours (makers / tech / buyers) stay for the map; buyer moved from magenta to raspberry so it doesn't read as the accent.
- **Type**: Mona Sans for Latin, Heebo for Hebrew (Mona Sans has no Hebrew; Heebo is the closest neutral grotesque).
- **One product**: the same tokens in `app/globals.css` and `site/app.html`.

## Design round: founder + UX + copy + QA pass on v5 (owner: "the product got lost chasing Awwwards")
- **Product first**: the home page now shows this week's three updates (the digest's lead items) right under the hero, and the primary button is the digest sign-up (stage 1). Company cards carry what they commission (and through which agency), or their clients, or what they do, plus the latest update with its date; the generic "עדכון" tag and the hover-only caption are gone, so phones see it too. Thumbnails show the logo once (no repeated name); the company page orders description → why now → what they buy → ways in → crafts.
- **Copy**: shorter everywhere ("מי מזמין מה. ומה השתנה השבוע.", one-line list intros, short search placeholders). Filter labels say what they do ("לקוחות או ספקים", "סוג חברה").
- **QA**: section titles inside a page sit under the page title (20–24px, 600); tags start-aligned with the page; home tender cards fill the row; logos sit on the grey (multiply) so white logos no longer vanish into a white square; footer links two per row on phones. RTL arrows checked: "‹" and "←" point forward in Hebrew, "→" only in English.

## Visual design v5 (owner: "copy Awwwards' filtering, thumbnails and inner pages as close to 1:1 as possible; we can change later")
- Measured from the owner's screenshots: page `#f8f8f8`, grey blocks `#ededed`, page-coloured buttons in a grey filter tray (details in `team/DESIGN.md`).
- **Header**: a promo strip above it (digest + survey ticker, replacing the survey banner). A search field in the bar in both apps (site search on the Next pages, the list's own search in the companies app). On phones: hamburger, wordmark, search, icon.
- **Companies list**: a small title with a count box; a tray of six filter dropdowns with radio rings (Show, Type, Craft, Industry, City, Sort) replacing the lens switch, the filter sheet and the sort select. Cards are thumbnail-first with an Awwwards-style byline; the details moved into the hover caption and the company page.
- **Company page**: full screen on phones, a square ink close button, dotted section labels, description first, pill tags.
- **Next listing pages** (people, tenders, search): the same small title + count box; the search and filters sit in a grey tray. The home hero loses its search (the header has it) and gets two buttons.
- Thumbnails use our 64px logos, not screenshots of company sites. Screenshots would need a capture service and storage; that's a later decision.

## Visual design v4 (owner: "even more like Awwwards: same margins, UI, menu, hamburger on phones, their buttons; mostly monochrome greys, purple less dominant")
- **Spec**: `team/DESIGN.md` (analysis of awwwards.com + our tokens and components). Supersedes v3's look below.
- **Look**: grey canvas `#e9e9e9`, white cards, `#222` ink, no shadows or gradients; 4/8/14px radii only; wide layout (max 1760px, 16–32px side margins).
- **Buttons**: Awwwards' pair, filled ink or outlined ink, same size, 8px corners, 500 weight. No purple buttons.
- **Purple**: a marker only (wordmark dot, metadata dot, current menu item, focus ring, new-update count, tender closing soon).
- **Type**: Inter Tight (Latin) replaces Mona Sans; Heebo stays for Hebrew. Display 300, headings 400, no 700+.
- **Menu**: one header for both apps; under 861px a hamburger opens a full-height menu (big light words on hairlines, full-width call to action, theme button). The companies app's section switcher is a floating ink bar.
- **Footer**: one source (`footerHtml()` in `lib/chrome.mjs`) for both apps.

## Visual design v3 (owner: "Awwwards-like UI and UX instead of Dribbble") (look superseded by v4)
- **Reference**: the editorial sites featured on Awwwards (Site of the Day style). Inspiration only: no Awwwards name, badge, copy or assets, and nothing copied from a specific winner.
- **Look**: warm paper canvas (`#f5f4f0`), near-black ink (`#0f0d14`), hairline rules instead of shadows, squarer cards (8/12/20px radii; buttons and tags stay pills). Dark theme is the same idea inverted (`#0b0a0f` / `#f2f0ea`). Accent stays Simply's purple; all text pairs pass WCAG AA.
- **Type**: oversized display headings (hero up to 120px, page heads up to 72px, weight 800, tight leading), start-aligned, calm 16px body. Still Mona Sans + Heebo, no tracking or uppercase on Hebrew.
- **Layout**: start-aligned page heads with a hairline under them; home sections open with a numbered label on an ink rule ("01 חיפוש לפי תחום"); crafts are an index grid of hairline cells; "what you get" is numbered rows with an arrow; the digest sign-up sits in an inverse (ink) block.
- **Motion**: hover states fill with ink or draw a line (nav underline, arrows sliding in); the hero settles in on load; sections rise into view where `animation-timeline: view()` is supported; a decorative craft ticker (aria-hidden; its links are in the grid). Everything stops under `prefers-reduced-motion`. No custom cursor, no scroll-jacking, no preloader: speed and tap targets (≥44px) come first.
- **One product**: same tokens in `app/globals.css` and `site/app.html`; header and footer in `app/chrome.css`.

## Design round 1: layout, naming, people seed (owner feedback on v2)
- **Layout**: search moved out of the header. Header = logo, People, Companies, one call to action (same bar in the companies app). Centered hero and section intros; one container (max 1200px, side gutter 20–48px); spacing, type and radius scales as tokens.
- **Naming**: the directory was called "the map", but it isn't one. It's now **חברות** (Companies) at `/companies`, everywhere: nav, buttons, numbers, footer, titles. `/map` and `/map/app.html` redirect there (an `#org-id` still opens the company). Its tabs: שאלו / כל החברות / סיגנלים / מעקב.
- **Hero**: craft tiles are icons (Lucide style, one stroke weight, soft purple halo) with short names and a company count; they link to a craft search.
- **One search**: the home search box goes to `/search`, which returns companies and people together, with links to the full lists (`/companies?q=…&craft=…` opens the companies app filtered).
- **People seed**: `/people` starts with the 546 people already published in company records (`key_people`: public business roles with a source). Shown as compact cards marked "ממקורות פומביים", with role, company link, source and date; no contact details, photos or anything inferred. Registered members rank first with a "מאומת" badge. Each listed card has "זה אני" (onboarding prefilled with name, role and company; the profile stores `claimed_from` and replaces the card) and "בקשת הסרה" (no account needed; the card is hidden as soon as the request arrives; the research run then removes the name from the company record). Explained on `/privacy#public`.
- **Copy**: Hebrew rewritten to gender-neutral plural / infinitive, one word per concept (חברות, מאגר, סיגנלים, מעקב).


## Design round 2: QA fixes (independent review of round 1)
- **Companies on phones**: the build wraps `site/app.html` in a real document shell (doctype, charset, viewport, `lang="he" dir="rtl"`), so `/companies` renders at phone width instead of desktop width in quirks mode.
- **Companies lands on the list** ("כל החברות", lens "הכול"). Sections: כל החברות · עדכונים · מעקב · שאלו AI, as a pill row under the header on desktop and the tab bar on phones. Only the search stays sticky.
- **Ask AI on the site**: when the page isn't inside claude.ai, questions go to `/api/ask` (Claude with read-only tools over the published dataset: search_orgs, get_org, recent_signals; no per-person data; per-IP and global rate limits, low effort, 4k max tokens, ~50s budget). The tab is hidden when `ANTHROPIC_API_KEY` isn't set.
- **People from public sources**: former and deceased role-holders, and people whose only source is LinkedIn, are left out. Research notes in brackets move out of the title. Dates read "נכון ל<month>" and come only from the role's own `as_of` (never the company's last check). "ממקורות פומביים" is explained once in the section header ("מפרסומים פומביים"); removal moved into a ⋯ menu on each card. Standard titles shown in neutral Hebrew where one exists (ראש ההפקה, קריאייטיב דיירקטור), the published title on hover.
- **Badges**: members are "חבר קהילה", not "מאומת" (nothing is verified yet). A domain-verified badge is pending the owner's decision.
- **Vocabulary**: "סיגנלים" → "עדכונים" everywhere in the UI. Craft labels without slashes (`schema/taxonomy.json`). One "תחום" filter: a craft matches a company's categories or what it commissions, the same rule in `/search`, `/people` counts and `/companies`.
- **Type and colour**: Heebo for all Hebrew, no uppercase or letter tracking, no monospace face (tabular figures instead). One accent: org types are told apart by label, not colour. SVG icons instead of text glyphs.
- **Phones**: every tap target ≥44px. The site is Hebrew-only (the English toggle stays for the claude.ai app).
- **Privacy contact**: `NEXT_PUBLIC_PRIVACY_EMAIL`, shown on `/privacy` and in removal errors when set. Until then, removal is the form on each card.

## Design round 3: QA fixes (independent review of round 2)
- **One header and footer**: `lib/chrome.mjs` + `app/chrome.css` are the only source; the build writes them into `/companies`. Same metrics on every page at 360/390/768/1440, 20px gutter at 360. `/companies` has the site footer. Its header button follows sign-in (`/api/session`).
- **Removal is honest and complete**: a removed person also leaves the company pages and the AI answers right away (`/api/hidden` sends short hashes, not names). The wording says exactly that: off the site within a minute, out of the company record at the next research update. Without a database the form says it can't be sent; a mailto only appears when `NEXT_PUBLIC_PRIVACY_EMAIL` is set (no invented address).
- **One search rule**: a query that is a craft's name or alias ("מושן", "VFX") is that craft on `/search`, `/people` and `/companies`, so the counts match (165 for motion). Hebrew title words find published titles (מנכ״ל → CEO, מפיק → producer, במאי → director); ״ and " are ignored.
- **People cards**: titles as published, Hebrew only for neutral loanwords (קריאייטיב דיירקטור, ארט דיירקטור, ראש ההפקות); research notes moved to `key_people[].note` (schema). "זה אני" shows only when sign-up is open. `/people` lists people first; the members section appears only when there are members. Company and title are one link (44px).
- **Data copy**: no gendered slashes in job posts ("משרה פתוחה ב־Wix: מושן דיזיין"), no stale "פורסם לפני…", Hebrew quotes ״…״, maqaf (ב־ICE), gershayim (סמנכ״לית), no internal "עדיין לא במאגר" notes. In Hebrew the credits line is hidden (the Hebrew headline already names them).
- **Companies app polish**: people as name-over-role rows; "Name (Other name)" and Hebrew names find the company (no duplicate agency pills); sizes with a unit ("יותר מ־5,000 עובדים"); default order mixes studios, clients and startups; lens "לקוחות"; "+ בחירת תחומים" with a one-line hint; the Updates badge counts what's new since the last visit; unknown `#company` shows a toast; text cut at word boundaries, never inside brackets.
- **Everywhere**: hover styles only on devices that hover; no text under 13px; no letter-spacing on Hebrew headings; craft labels from the taxonomy everywhere ("יצירה עם AI"); "חברת הפקות"; the home page is ~2.5 phone screens (no steps section; join panel only when sign-up is open).

## 2026-10-20 · Weekly digest "השבוע בתעשייה" (strategy wedge #1)
- **Why**: the strategy round found the unmet need is knowing who commissions what and what changed this week. A weekly, craft-tailored digest is the daily proof of value and the main sign-up driver; profiles are a by-product.
- **What**: web edition at `/digest` (general, or `?crafts=` for a personal preview), shareable, with a ready LinkedIn post (UTM-tagged). Email every Sunday morning, or every two weeks, or monthly. Email-only sign-up: no profile needed.
- **Content rules**: only the published directory, every update with its source; "why it matters" from the signal; "who commissions X now" picks get a reason that isn't already listed; news older than the period only if it reached us during it (max two weeks late). Empty editions aren't sent.
- **Consent**: unchecked box with the stored consent text (anti-spam law §30A). One-click unsubscribe (RFC 8058) plus a confirm page, so link scanners can't unsubscribe anyone.
- **Sending**: Resend (free: 100/day, 3,000/month). Daily cron with a two-day catch-up keeps under the daily cap; `digest_sends` makes runs idempotent.
## Rates and payment-terms survey 2026
- **Why**: no public data on rates for motion, animation, VFX, post or sound in Israel (UXI covers UX only), shotef + 60/90 is normal, and AI is moving prices. A yearly survey is shareable on LinkedIn, builds the email list and gives people a reason to sign up.
- **Scope**: 16 crafts × 5 work modes. Freelancers and studio owners answer hourly/day rates, 2–3 typical deliverable prices for their craft, payment terms, late payments and delay, client types; employees answer monthly gross salary. Everyone answers channels (max 3) and AI impact on demand and on rates. Answers are bands with an optional exact number (sanity-limited). No client, company or person names are asked; contact details typed into the optional free text are removed before saving, and the text is never published.
- **One response per account**, editable until **31 Dec 2026**; full report in January 2027.
- **Privacy**: answers in `survey_responses` with owner-only RLS; aggregation only on the server with the service role. Any group under **5** respondents shows no numbers; amounts are rounded (₪10/hour, ₪50/day, ₪500 salary and prices). Deleting the account deletes the response.
- **Access**: three headline numbers are public from **30** responses. Full results (craft × mode tables, deliverable prices, terms, lateness, channels, AI) open to respondents, or to anyone whose invite link brought **3** people who answered. Each person gets an invite code (`?ref=`), recorded once per invited account (`referrals`, server-only), and a ready Hebrew LinkedIn post.
- **Entry points**: a slim line on the home page, at the bottom of `/people` and under the company list; it disappears when the survey closes.

## 2026-10-20 · Launch-pack hardening (independent review of digest + survey)
- **Double opt-in, server-written consent**: nobody is subscribed until they open the link sent to the address. The opt-in rides on the magic link (`/auth/callback?subscribe=…`) and the server records consent with its own wording. Sending uses only confirmed addresses taken from `auth.users` (`digest_recipients()`), never a column people can edit. People can read but not write `newsletter_prefs` or `survey_responses` (migration 005).
- **Sender identity required**: the cron and the test route refuse to send until the sender's name, address and contact email are set; every footer shows them.
- **Survey results resist comparison**: published from a snapshot that changes at most once a day and only after 5 new answers; groups under 5 are left out entirely; exact typed numbers only from 10; shares rounded to 5%; sizes as buckets ("10+"). The invite counter moves with the snapshot. Copy says "חסוי" (confidential), not "אנונימי": answers are tied to an account.
- **Invites**: credited only to a confirmed, brand-new account created through the link; not your own code, not "+alias" addresses, first inviter wins.
- **Digest relevance**: an update is "in your crafts" only if it names the craft or credits someone who does it; everything else is "עוד בתעשייה". Subjects count only real matches. Picks lead with what the buyer commissions in that craft, then the news. "נוספו למאגר" counts only companies added since the last edition (the launch directory isn't "new") and never makes an edition worth sending on its own. Email: at most 5 updates and 3 picks.
- **Also**: unsubscribe works with GET (confirm page) and one-click POST, plus a mailto when a contact email is set; per-user rate limits and a 32KB body cap on the write APIs; survey drafts in the browser are per account and cleared on sign-out; one sign-up form on the home page with an optional digest box; share images for `/digest` and `/survey`.

## 2026-10-20 · Stage 1 is information + newsletter; light theme by default
- Owner: "זה אני" felt odd; for the first stage nobody fills a profile. Everything here is information: who commissions what, who decides, what changed this week and why now, plus the weekly digest by craft.
- Profiles, onboarding, member cards and claiming a listed person are switched off behind one flag (`NEXT_PUBLIC_PROFILES`), not deleted. Removal requests stay (legal). Sign-in by email remains for the digest and the survey only.
- The header call to action is now the weekly digest ("לגיליון השבועי").
- The site was following the phone's dark mode, which looked like a sudden switch. Light is now the default everywhere, with a header toggle: בהירה / כהה / לפי המכשיר.
- The company detail panel on desktop opens from the reading side (right in Hebrew, left in English).


## 2026-10-20 · Alerts on followed companies
- Owner approved "מעקב והתראות": follow a company and get an email when something changes there. Email only, no profile.
- Named "התראות על החברה" (bell) so it isn't confused with the companies app's local "מעקב" (pipeline). People who saved companies in that list are offered to turn on alerts for them.
- A separate list from the digest, with its own consent wording and unsubscribe link. One email per day at most, bundling every new update; or a weekly summary on the digest's Sunday. Following an org only sends updates that reached the directory from the day of the follow.
- Not done yet: removing an update from the weekly digest when the person already got it as an alert.
## Open tenders (2026-10-20)
- New section "מכרזים" (`/tenders`): public tenders and supplier-pool calls for creative work, soonest deadline first, with a countdown and a link to the official notice only. Also a home-page strip (top 3), in site search, and a section in the weekly digest (max 3, matched to the reader's crafts). An open tender in the reader's crafts makes an edition worth sending.
- Records live in git like signals (`data/tenders/YYYY-MM.json`, `schema/tender.schema.json`, `landscape.py tenders`). The weekly research run collects them (step 5c, `research/tenders-sources.md`); mr.gov.il is the main source, collected politely by `scripts/tenders_mrgov.py` as candidates that a person or the agent reviews.
- Facts only: title as published, buyer, number, dates, plus our own one-line summary. Never contact names or emails, never aggregator content, never fetch around a block. לפ"מ exemption notices are signals (who was hired), not tenders.
- "מכרזים" joins the header nav. To keep the header one 64px row on phones, the colour-theme button moves to the footer under 480px, and under 380px the newsletter button becomes an envelope icon.



## 2026-10-20: Pre-launch hardening

- One "מעקב" button on a company: it saves to the tracking list, and alerts by email come with it when the person has agreed to them; otherwise they are offered, optionally. Two buttons that looked alike were confusing.
- Migrations run once each, in one transaction, only on production deploys, with a ledger. A failed migration fails the deploy instead of leaving the database half-done or with permissions re-opened. Browser roles have no write access to any of our tables.
- Magic links work only on the device and browser that asked for them, so every confirmation message says so. Signed out, /me is a sign-in form; signed in, the header button is "החשבון שלי".
- Alerts never send twice: claims are per run, retries reuse the same key, and an unanswered request keeps its claim (at worst one alert is missed). Alerts and the digest share the 100-a-day free sending budget.

## 2026-10-26: Typography and copy after Firma
- Owner asked to take typography and copy inspiration from Firma (firmabrands.com/he). Layout and colour stay Awwwards-based.
- Hebrew moves from Heebo to Rubik (closest free match to Firma's Polin). Nothing under weight 400; headlines 600 with tight leading; leads 18–20px.
- Copy: short lines ending with a period, a kicker over section titles, and "In" as the one brand pun ("לא צריך להכיר את כולם. מספיק להישאר In."). Details in `team/DESIGN.md`.
