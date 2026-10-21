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

## 2. How we apply it

### Tokens
These are set in `app/globals.css` and repeated in `site/app.html`.

| Token | Light | Dark |
|---|---|---|
| `--bg` (canvas) | `#e9e9e9` | `#111111` |
| `--surface` (paper) | `#ffffff` | `#1c1c1c` |
| `--soft` | `#f4f4f4` | `#262626` |
| `--soft-2` | `#dedede` | `#2e2e2e` |
| `--ink` | `#222222` | `#f2f2f2` |
| `--ink-2` | `#4d4d4d` | `#cfcfcf` |
| `--muted` | `#5c5c5c` (5.5:1 on canvas; Awwwards' `#808080` fails AA) | `#9a9a9a` |
| `--line` / `--line-2` | `#d6d6d6` / `#b8b8b8` | `#333` / `#4d4d4d` |
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
