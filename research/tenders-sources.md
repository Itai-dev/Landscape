# Open tenders: sources and rules

Research notes for the "מכרזים פתוחים" feed (checked 20 Oct 2026). Records live in `data/tenders/YYYY-MM.json`
(by published month), schema `schema/tender.schema.json`, merged with `python3 scripts/landscape.py tenders FILE`.

## Rules

- **Link to the official notice only.** Never to an aggregator, never copy aggregator text (Yifat Michrazim,
  Wizbiz and the like are paid and "all rights reserved"). An aggregator can be a hint; confirm on the official page.
- **Facts only:** title as published, buyer, number, dates, our own one-line `scope_summary`. Facts are not
  protected by copyright (Copyright Act 2007 §5); tenders are public notices. Not legal advice.
- **No personal data.** Detail pages list contact names, emails and phones: never store them. לפ"מ exemption
  notices name individual directors and talent: keep company names only.
- **Record when submissions open.** mr.gov.il detail pages show "מועד תחילת ההגשה" separately from the
  deadline, and it can be weeks after publication. Store it as `submission_opens` (Israel time). Until then the
  site shows the tender as "ההגשה נפתחת ב־…", never as open, and it doesn't count as open anywhere.
  Re-check `deadline_at`, `submission_opens` and status on every run: buyers move dates ("עודכן").
  Verification log 21 Oct 2026: all 11 records checked against the official page or PDF (dates, buyer,
  title, URL); two (mr-4000622905, mr-4000623022) were published but not yet open.
- **Never bypass a block.** gov.il, Kan, Tel Aviv municipality and others sit behind Cloudflare/WAF (403/472).
  Use web search for those and link the official page you find; don't fetch around the block.
- **Fetch gently:** at most a few dozen requests a week to mr.gov.il, 1–2 s apart, with a UA that names Landscape.
- **TAU** (tenders.tau.ac.il): its terms (§7.6.2) forbid copying "המידע והנתונים" without consent. Set
  `link_only: true` and keep title, buyer, deadline and the link.

## Sources, by expected yield

1. **mr.gov.il** (מינהל הרכש הממשלתי), plain HTML, the main source.
   - Search: `https://mr.gov.il/ilgstorefront/he/search/?q=<word>%3AupdateDate%3Aarchive%3Afalse[%3Acategory%3A<code>]&text=<word>&s=TENDER&page=N`
     (`s=TENDER` tenders, `s=EXEMPTION` exemption notices, `i=CENTRALTENDER` central tenders; ~20 results a page,
     newest first; each row has buyer, status, number, publish date and deadline).
   - Detail: `https://mr.gov.il/ilgstorefront/he/p/<publication no.>` (deadline, documents, topic tags). Bids go
     through quickbid.gpa.gov.il.
   - Category codes: ZD43 (עריכה, כתיבה, עיצוב, גרפיקה ואומנות), ZD430003 הפקת וידיאו, ZD430005 טלוויזיה,
     ZD430006 צילום, ZD430007 עיצוב גרפי, ZD550001 הפקת אירועים, ZD550006 בידור, ZD550009 תרבות, ZD68 שיווק,
     ZD130002 שילוט ופרסום, ZD590001 שירותי תקשורת.
   - Tags are unreliable (the MFA media tender is tagged "יחסים בינלאומיים"), so search keywords too.
   - Search is exact-word, no stemming: "סרטונים" finds what "סרטון" misses. Use plural and construct forms.
   - No RSS/API. The data.gov.il "tenders" datasets stopped in 2023.
   - Supplier-pool calls (קול קורא / הצטרפות למאגר) are published as tenders: search "מאגר".
2. **mr.gov.il exemptions** (`s=EXEMPTION`), filtered to לפ"מ and creative keywords. These are not open tenders:
   they name the production company or agency hired, so they become **signals** (עדכונים), not tenders.
3. **Web search**: "מכרז" + creative keyword + year, for municipalities, government companies, NGOs (often PDFs).
4. **Dekel** (official buyer platform, static): `https://bids.dekel.co.il/` (Netivei Ayalon, Airports Authority,
   BGU, regional companies) and `https://bids.dekel.co.il/jerusalemMuni` (no deadlines in the list; open each item).
5. **Be'er Sheva** open data (updated weekly):
   `https://data.gov.il/dataset/f4a5cdab-82b2-48ad-9d95-424a035cfed8/resource/02df5e1b-e53e-41d7-a1d3-1aeb9983b7c9/download/tender.json`.
   Check data.gov.il for other cities too.
6. **Haifa**: `https://www2.haifa.muni.il/Michrazim/Default.aspx` (WebFetch works; curl is blocked).
7. **Tel Aviv University**: `https://tenders.tau.ac.il/` (link only, see rules).
8. **Weizmann**: `https://www.weizmann.ac.il/michrazim/`.
9. **Search only** (blocked to fetching): kan.org.il/tenders, rail.co.il, iec.co.il, pais.co.il, gov.il, tel-aviv.gov.il.
10. **ice.co.il** advertising news, to hear of advertising-budget tenders; confirm the official page.
11. **Calls** from the Innovation Authority, the Film Fund and other funds, via web search.

## Keywords (exact forms)

הפקה, הפקת, קמפיינים, פרסום, מיתוג, עיצוב, גרפיקה, צילום, וידאו, וידיאו, סרטונים, אנימציה, תוכן, ניו מדיה,
רשתות, משפיענים, הסברה, מולטימדיה, פודקאסט, אירועים, טקס, טקסים, ביתן, תערוכה, כנס, כנסים, שיווק, מדיה,
קריאייטיב, מאגר, קול קורא.

Exclude: נייר צילום, שוברי שי, הפקת נסיוב, הפקת טסיות, מחשוב, הפקת מסמכים, סורקים, מתכלים and other
non-creative uses of the same words. `scripts/tenders_mrgov.py` drops these; still read every candidate.

## Expected volume

About 0.5–1 clearly creative tender a week on mr.gov.il (~15 in the 26 weeks to 20 Oct 2026), plus perhaps 1–3
from municipalities, government companies, universities and NGOs. Expect 4–10 open at any time, more before
budget cycles and holidays. Plus 2–4 לפ"מ exemption notices a week for signals.
