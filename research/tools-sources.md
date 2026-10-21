# Tools ("כלים ו־AI"): sources and rules

The catalog (`data/tools/catalog.json`) lists tools that creative professionals in Israel work with. Updates
(`data/tools/updates/YYYY-MM.json`) are dated changes to those tools. Both are built into `site/data/tools.json`.

## Rules

- **Official sources only.** An update comes from the maker's own changelog, blog, newsroom or press release, with
  the date the maker published it. No reviews, listicles or "best of" posts, including the maker's own SEO posts.
- **No affiliate links, no paid placement.** `url` is the tool's official site, with no tracking parameters.
- **Facts, not hype.** `headline_he` says what changed; `why_he` says who it matters to and why, factually
  ("לעורכים: …"). No "מהפכה", "משנה את כללי המשחק".
- **Only what a source confirms.** `pricing` and `made_in_israel` are left out when no source confirms them.
  `made_in_israel` needs a source for the company being Israeli (founded or headquartered in Israel).
- **Window.** The site shows updates from the last 60 days; the digest takes up to 3 from the last 30 days.

## Where to look

| Tool | Updates |
|---|---|
| Figma, Figma Weave | https://www.figma.com/blog/news/ |
| Runway | https://runway.com/changelog |
| Adobe (Photoshop, Premiere, Firefly, After Effects) | https://blog.adobe.com/ |
| ElevenLabs | https://elevenlabs.io/blog |
| Midjourney | https://updates.midjourney.com/ |
| Higgsfield | https://higgsfield.ai/blog (only posts that announce a product; skip guides and comparisons) |
| Blender | https://www.blender.org/news/ and /press/ |
| Blackmagic (DaVinci Resolve) | https://www.blackmagicdesign.com/media/release/archive |
| LTX Studio (Lightricks) | https://ltx.io/blog |

## Adding updates

1. Write a JSON array of updates to `research/staging/tools-YYYY-MM-DD.json` (fields as in the schema; `id` is
   `tu-<date>-<tool-id>-<slug>`).
2. `python3 scripts/landscape.py tools research/staging/tools-YYYY-MM-DD.json`
3. `python3 scripts/landscape.py validate && python3 scripts/landscape.py build`

New tools go straight into `data/tools/catalog.json` (by hand; one entry per tool, with `sources`).

## Checked 2026-10-21

Catalog URLs were checked with one request each; Adobe, Unreal Engine and Canva answer bots with 403 but are the
official addresses. Weavy (now Figma Weave) is Israeli: Globes, 30.10.2025, "Figma acquires Israeli startup
Weavy". Lightricks (LTX Studio) is headquartered in Jerusalem (Wikipedia). Bria lists a Tel Aviv address on its
site. Left out as unverifiable: Sora (Higgsfield's blog mentions an API shutdown, availability unclear), Adobe MAX
2026 (keynotes not yet held), and any Higgsfield update older than its product posts.
