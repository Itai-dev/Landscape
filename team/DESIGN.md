# Design spec (v4): Awwwards as the reference

The owner asked for the site to look and work like awwwards.com: same margins, same UI, the same menu, a hamburger on phones, and the same buttons. Colour should be mostly monochrome greys, with our purple kept but much less dominant.

Inspiration only. We copy the design language, never Awwwards' name, logo, wording, images or code.

## 1. Analysis of awwwards.com

**Sources.** The page structure came from awwwards.com itself (October 2026). The visual values came from a published token extraction of the site (styles.refero.design), checked against the structure. The site blocks automated browsers from our build machine, so nothing here was measured from its live CSS. Where sources disagreed, we picked the value that fits the rest of the system.

### Page structure
- **Header.** Logo at the start, then a few short words: Explore (a mega menu), Directory, Academy, Jobs, Market. At the end come the account actions and two calls to action: a filled "Be Pro" and an outlined "Submit Website". The bar is flat: no border, no shadow, same colour as the page.
- **Hero.** One featured site. Above the title sits a small metadata row: label, date and score, at 11–12px. The title is huge (about 127px), light (300), tight (0.93 line height) and centered. Credits and a full-bleed image follow.
- **Sections.** They repeat one pattern: a big light title at the start ("Nominees", "Winners", "Academy", "Collections", "Directory", "Blog", "Market") and an outlined "View …" button at the end, with a grid of cards underneath.
- **Cards.** White paper on a grey canvas, 8px corners, no border and no shadow. Image first, then a 600-weight title, then quiet metadata. Small ink labels mark status: PRO, NEW and the score.
- **Floating tab bar.** A dark bar with 14px corners sits centered over the content and switches sections.
- **Promos.** "Be Pro" and "Submit" appear as large dark blocks.
- **Footer.** Columns of plain links, a "Connect" row, then legal links.
- **Phones.** Logo, one button and a hamburger. The menu fills the screen with large words.

### Visual language
| | Awwwards | Notes |
|---|---|---|
| Canvas | `#e9e9e9` | the page itself is grey |
| Paper | `#ffffff` | cards, fields, panels |
| Ink | `#222222` | text, filled buttons, the tab bar |
| Greys | `#dedede` fog, `#b8b8b8` ash, `#808080` smoke, `#4d4d4d` graphite | dividers, outlines, secondary fills |
| Colour | one accent (orange), single elements only | e.g. the score |
| Type | Inter Tight, one family | weights 300 / 400 / 500 / 600, no bold 700+ |
| Display | ~127px, 300, line height 0.93 | hero titles |
| Section titles | 42–64px, 300–400 | |
| Body | 14–16px, 400 | |
| Labels, buttons | 13–14px, 500 | |
| Metadata | 11–12px | |
| Radius | 4px tags and badges, 8px buttons, cards, images and fields, 14px featured blocks and the tab bar | nothing else |
| Elevation | none | no shadows, no gradients; surfaces are told apart by colour |
| Buttons | filled ink, or outlined 1px ink; same padding (8×16) and same radius (8) | |
| Spacing | 4px grid; 8px between cards, 24/48px between sections | |
| Layout | wide; content runs almost edge to edge with thin side margins | |
| Motion | quiet: fades and short transforms | |

### Measured from the owner's phone screenshots (Oct 2026)
These override the extraction above where they differ.
- **Colours.** The page is `#f8f8f8`. Grey blocks are `#ededed`: the promo strip, the search field and the filter tray. Filter buttons are `#f8f8f8` (page colour) inside that tray. Ink is `#222`, underlines `#b7b7b7`, radio rings `#a7a7a7`. A dropdown dims the page behind it (about 30% black).
- **Mobile header.** Hamburger, the "W." logo, a grey search field that fills the rest of the row, and an account icon. A grey promo strip with a ticker runs above it and scrolls away; the header stays.
- **Listing page.**
  - The title is modest and semibold ("Winning websites. Web Design Inspiration"), with the count in a small box outlined in ink.
  - Under it, a grey tray of six filter buttons (Awards, Category, Tag, Technology, Country, Font), two per row on phones, each with a chevron.
  - Then a line of copy with bold words and an underlined "Read more".
  - Then the grid: one column on phones, the thumbnail on top with 8px corners.
- **Filter dropdown.** A page-coloured panel with 8px corners floats over a dimmed page. It holds a list of options, each with a radio ring.
- **Card byline.** Avatar, name in semibold, a tiny "PRO" superscript, and small outlined tags at the end ("DEV" in blue-grey, "SOTD" in orange).
- **Detail page.**
  - It covers the screen, with a square ink close button flush in the top corner.
  - Each section has a small regular label ("Technologies & Tools", "Description", "Inside look") over a dotted rule.
  - Tags are fully rounded outlined pills. The description is set large and light. Headings are big and semibold.

## 2. How we apply it

### Tokens
These are set in `app/globals.css` and repeated in `site/app.html`.

| Token | Light | Dark |
|---|---|---|
| `--bg` (page) | `#f8f8f8` | `#111111` |
| `--surface` (grey blocks: cards, fields, trays, strip) | `#ededed` | `#1e1e1e` |
| `--paper` (on a grey block: filter buttons, dropdown) | `#f8f8f8` | `#111111` |
| `--soft` (hover on grey) | `#e3e3e3` | `#2a2a2a` |
| `--soft-2` | `#d9d9d9` | `#333333` |
| `--radio` | `#a7a7a7` | `#6a6a6a` |
| `--ink` | `#222222` | `#f2f2f2` |
| `--ink-2` | `#4d4d4d` | `#cfcfcf` |
| `--muted` | `#5c5c5c` (5.7:1 on `#ededed`; Awwwards' `#808080` fails AA) | `#9a9a9a` |
| `--line` / `--line-2` | `#dcdcdc` / `#b7b7b7` | `#333` / `#5a5a5a` |
| `--accent` | `#8217ff` (Simply purple) | `#a466ff` |
| Radii | `--r-sm` 4, `--r` 8, `--r-lg` 14 | |
| Layout | `--max` 1760px, `--gutter` 16–32px | |

### Purple: where it may appear
Purple is our version of Awwwards' orange: one small marker, never a button, a fill or a link colour. It may appear only in these places:
- the dot in the "Landscape." wordmark;
- the dot before the hero metadata row;
- the dot beside the current page in the phone menu;
- the focus ring;
- the count of new updates in the companies app;
- the deadline badge on a tender that closes soon.

### Type
- **Fonts.** Inter Tight for Latin, Heebo for Hebrew. Inter Tight has no Hebrew, so Hebrew falls through to Heebo. No letter spacing and no uppercase on Hebrew.
- **Sizes.** Hero 48–127px at weight 300, line height 0.93. Page titles 36–64px at 400. Section titles 26–42px at 400. Card titles 18px at 600. Body 16px (one step above Awwwards' 14px, for Hebrew reading). Labels and buttons 14px at 500. Metadata 12px.

### Components
- **Promo strip** (`promoHtml()` in `lib/chrome.mjs`). A grey line above the header with a slow ticker: the weekly digest, plus the rates survey while it's open. It replaces the old survey banner, scrolls away, and holds still under reduced motion.
- **Header search** (both apps). A grey 8px field. On the Next pages it searches the whole site (`/search`). In the companies app it is the list's own search (`#q`).
- **Phone header.** Hamburger at the start, the wordmark, the search field filling the row, and the call to action as a plain icon (envelope, or a person when signed in).
- **Listing heads** (`.pagehead.list`, the companies `.listhead`). A modest 600 title, a `.cbox` count outlined in ink, and a line of copy with bold words.
- **Filter tray** (`.toolbar` on the Next pages, `.ftray` in the companies app).
  - A grey block holding page-coloured buttons, 2 columns on phones and 6 in a row from 900px.
  - The six buttons in the companies app are Show, Type, Craft, Industry, City and Sort.
  - A button shows its chosen value (single choice) or an ink count (multiple choice), plus an ink outline while set.
- **Filter dropdown** (`#dd`).
  - On phones it covers the tray, full width. On desktop it opens under its button, at least 320px wide. The page is dimmed and locked behind it.
  - The options have radio rings, filled ink when chosen. A single choice applies and closes. A multiple choice stays open, with "ניקוי" and an ink "הצגת N חברות" button.
  - Esc, a tap on the dimmed page, or ✕ closes it, and focus returns to the button.
- **Thumbnail cards** (companies).
  - A 4:3 grey tile with the logo (64px, on white) over the name in light type. A company without a logo shows its name as a wordmark.
  - On hover the tile zooms slightly, and an ink caption slides up with what they buy, their clients, or what they do.
  - Under the tile is the byline: a round logo, the name in 600, the kind as a superscript, and the city. Small outlined tags sit at the end: "עדכון" with a purple dot, the saved stage in ink, and "מתאים לכם".
  - Cards are 40px apart vertically and 16px horizontally.
- **Company page** (`#sheet`).
  - It covers the screen on phones; on desktop it is a 920px panel from the reading side. It has a square ink ✕ in the corner.
  - Top to bottom: a large thumbnail, the metadata line, the name (600, up to 52px), and the actions.
  - Sections each have a small label over a dotted rule. Description comes first, set large and light, followed by the facts, then crafts as pill tags, then why now, what they commission, ways in, links and sources.
- **Header** (`lib/chrome.mjs`, `app/chrome.css`; one source for both apps).
  - The bar is flat and canvas-coloured: the wordmark, then People / Companies / Tenders at 14px/500. The current page gets a white 8px label.
  - At the end: the theme button (40px, outlined) and one filled ink call to action.
- **Hamburger** (under 861px).
  - The bar shows the wordmark, the call to action and a 44px outlined button whose two lines turn into an X.
  - It opens a full-height sheet under the bar: big light words on hairlines, with the call to action as a full-width ink button and the theme button beside it.
  - Esc, a tap on a link, or widening the window closes it. Focus moves into the menu on open and back to the button on close, and the page doesn't scroll behind it.
- **Buttons** (`.btn`).
  - The default is outlined: 1px ink border, 8px corners, 14px/500, 44px tall. On hover it fills with ink.
  - `.primary` is filled ink and dims on hover. The two share the same size.
  - `.accent` is now also ink. `.ghost` is an underlined text button. `.sm` is 36px, and goes back up to 44px on touch screens.
- **Section heads** (`.sechead`). A light title at the start and an outlined "לכל …" button at the end.
- **Cards.**
  - Cards, tenders, people, updates and rows are white on the canvas with 8px corners, no border and no shadow, 8px apart.
  - Hover shows an ink outline, or fills with ink on the craft tiles.
- **Tags and badges.** Tags are outlined in ash with 4px corners at 12px/500. Badges are small ink labels with 4px corners at 11px/600.
- **Fields.** White, 8px corners, an ink border on focus, no glow ring.
- **Search.** A white 8px field with a square ink button at the end.
- **Companies app.**
  - The section switcher is a floating ink bar with 14px corners, the current section on a canvas-coloured label. It sits centered under the header on desktop and floats at the bottom on phones.
  - The lens switch is a grey track with an ink thumb.
- **Promo block** (`.panel.inverse`). Ink with 14px corners and a light title, with an outlined button in the canvas colour.
- **Footer.** A white block with 14px corners: a large wordmark and tagline, a grid of links, then small print and the theme button.

### Motion
- Hovers run 0.2–0.3s on `ease` / `cubic-bezier(.22, 1, .36, 1)`.
- The hero settles in on load, and sections rise into view where the browser supports `animation-timeline: view()`.
- The menu links stagger in.
- All of it is off under `prefers-reduced-motion`. There is no custom cursor, scroll-jacking or preloader.

### What we keep from before
- RTL and logical properties.
- Tap targets of at least 44px on touch screens.
- Light by default, plus the theme toggle.
- The gender-neutral copy rules.

### What we don't copy
- The Explore mega menu: we have three sections.
- Image-led cards: we have no screenshots of companies.
- The score styling.
- The social-icon rows.
