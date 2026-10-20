#!/usr/bin/env python3
"""Collect creative tender *candidates* from mr.gov.il (מינהל הרכש הממשלתי) for the research run.

  python3 scripts/tenders_mrgov.py                  # keywords + creative categories, open notices only
  python3 scripts/tenders_mrgov.py --max 20         # fewer requests

Writes research/staging/tenders-candidates-<date>.json: one row per notice that is still open, with the fields
exactly as listed (title, buyer, numbers, dates). These are candidates, not records: the research agent opens
each detail page, keeps only creative work, writes `scope_summary` and `crafts`, and merges the result with
`landscape.py tenders`. See research/tenders-sources.md for the rules.

Polite by design: at most --max requests (default 40), 1.5 s apart, a User-Agent that names Landscape, and no
retries. It never stores contact names, emails or phones.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://mr.gov.il/ilgstorefront/he"
UA = "Landscape research bot (+https://landscape-ten-phi.vercel.app; Israeli creative-industry directory)"

# Exact word forms: the site search has no stemming (see research/tenders-sources.md).
KEYWORDS = ["הפקה", "הפקת", "קמפיינים", "פרסום", "מיתוג", "עיצוב", "גרפיקה", "צילום", "וידאו", "וידיאו",
            "סרטונים", "אנימציה", "תוכן", "משפיענים", "הסברה", "מולטימדיה", "פודקאסט", "אירועים", "טקסים",
            "ביתן", "תערוכה", "כנסים", "שיווק", "מדיה", "קריאייטיב", "מאגר", "קול קורא"]
CATEGORIES = ["ZD43", "ZD430003", "ZD430005", "ZD430006", "ZD430007", "ZD550001", "ZD550006", "ZD550009",
              "ZD68", "ZD130002", "ZD590001"]
EXCLUDE = re.compile(r"נייר צילום|שוברי שי|הפקת נסיוב|הפקת טסיות|מחשוב|מכונות צילום|הפקת מסמכים|סורקים|מתכלים")


def search_url(word: str | None, category: str | None, kind: str = "TENDER", page: int = 0) -> str:
    q = f"{word or ''}:updateDate:archive:false" + (f":category:{category}" if category else "")
    params = {"q": q, "text": word or "", "s": kind}
    if page:
        params["page"] = str(page)
    return f"{BASE}/search/?" + urllib.parse.urlencode(params)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "he"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def _field(block: str, label: str) -> str | None:
    m = re.search(re.escape(label) + r"(?:&nbsp;|\s)*</span>\s*<span[^>]*>(.*?)</span>", block, re.S)
    return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else None


def _date(s: str | None) -> str | None:
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})(?:\s*,?\s*(\d{2}):(\d{2}))?", s or "")
    if not m:
        return None
    d, mo, y, hh, mm = m.groups()
    return f"{y}-{mo}-{d}" + (f"T{hh}:{mm}" if hh else "")


def parse(page: str) -> list[dict]:
    rows = []
    for block in page.split('class="result-container"')[1:]:
        m = re.search(r'href="/ilgstorefront/he/p/(\d+)"><h2[^>]*>(.*?)</h2>', block, re.S)
        if not m:
            continue
        num, title = m.group(1), html.unescape(re.sub(r"\s+", " ", m.group(2))).strip()
        rows.append({
            "id": f"mr-{num}",
            "source": "mr.gov.il",
            "source_url": f"{BASE}/p/{num}",
            "title": title,
            "buyer": _field(block, "שם המפרסם:"),
            "status_listed": _field(block, "סטטוס:"),
            "procedure_no": _field(block, "מס׳ הליך:"),
            "published_at": _date(_field(block, "תאריך פרסום:")),
            "deadline_at": _date(_field(block, "מועד אחרון להגשה:")),
        })
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max", type=int, default=40, help="maximum requests (default 40)")
    ap.add_argument("--delay", type=float, default=1.5)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    queries = [(w, None) for w in KEYWORDS] + [(None, c) for c in CATEGORIES]
    seen: dict[str, dict] = {}
    now = dt.datetime.now()
    requests = 0
    for word, cat in queries:
        if requests >= args.max:
            print(f"stopped at --max {args.max} requests", file=sys.stderr)
            break
        url = search_url(word, cat)
        try:
            page = fetch(url)
        except Exception as e:  # no retries: be gentle, note it, move on
            print(f"  ! {word or cat}: {e}", file=sys.stderr)
            page = ""
        requests += 1
        for row in parse(page):
            if EXCLUDE.search(row["title"]):
                continue
            if row["deadline_at"] and dt.datetime.fromisoformat(row["deadline_at"] if "T" in row["deadline_at"] else row["deadline_at"] + "T23:59") < now:
                continue
            cur = seen.setdefault(row["id"], {**row, "matched": []})
            cur["matched"].append(word or f"category:{cat}")
        time.sleep(args.delay)

    out = Path(args.out) if args.out else ROOT / "research" / "staging" / f"tenders-candidates-{dt.date.today().isoformat()}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = sorted(seen.values(), key=lambda r: r.get("deadline_at") or "9999")
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(rows)} open candidates from {requests} requests → {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
