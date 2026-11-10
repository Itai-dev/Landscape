# Pictures for updates

An update can carry one picture: the cover on its page and on the home page, and the thumbnail in lists.
Without one, the site draws a cover from the company's logo (components/Cover.js). That's the default,
and it's fine: no picture is better than a doubtful one.

## Where a picture may come from
- The work's own official page: the brand's, agency's, studio's or production company's site, case study,
  press room or press kit.
- The official video on YouTube or Vimeo, from the brand's or the maker's own channel (its thumbnail).
- A press image the brand or agency released for publication ("באדיבות …").

## Never
- A news outlet's picture (ICE, Globes, Calcalist, mako, Geektime…): the photographer or the outlet holds the
  rights, even when the story is ours to summarise.
- Stock or photo-agency images (Shutterstock, Getty, Flash90…), and anything marked "צילום: <photographer>" unless
  the release says it's for publication.
- People's private photos, or a picture of a person for a story that isn't about their work.
- Generic platform cards (LinkedIn, Hugging Face, GitHub, mr.gov.il): they show the platform, not the work.

## How
```
python3 scripts/landscape.py image <sig-id> <official page or image URL> --credit "באדיבות מקאן תל אביב"
python3 scripts/landscape.py build
```
The page's share picture (og:image) is used; pass the image URL itself when the page has none. The tool
refuses pictures under 600px wide and non-landscape shapes. Masters live in `data/update-images/` with
`manifest.json` (page, picture URL, credit, date); the build ships 1200px WebP to `site/data/media/`.
The credit always shows on the picture and links to the page it came from. Asked to remove one:
`python3 scripts/landscape.py image <sig-id> --remove`, then build.
