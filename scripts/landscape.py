#!/usr/bin/env python3
"""Landscape data tool.

  python3 scripts/landscape.py validate            # check every record in data/orgs
  python3 scripts/landscape.py ingest FILE...      # merge staging JSON arrays into data/orgs
  python3 scripts/landscape.py build               # write site/data/dataset.json + exports
  python3 scripts/landscape.py stale [--days 90]   # records due for re-verification
  python3 scripts/landscape.py stats               # counts by kind / category / city
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
ORGS = ROOT / "data" / "orgs"
SCHEMA = json.loads((ROOT / "schema" / "org.schema.json").read_text())
TAXONOMY = json.loads((ROOT / "schema" / "taxonomy.json").read_text())
FIELD_ORDER = list(SCHEMA["properties"].keys())
LIST_FIELDS = {"aka", "categories", "services", "notable_clients", "notable_work", "tags", "sources"}
CONF_RANK = {"low": 0, "medium": 1, "high": 2}
TODAY = dt.date.today().isoformat()

try:
    import jsonschema

    _VALIDATOR = jsonschema.Draft202012Validator(SCHEMA, format_checker=jsonschema.FormatChecker())
except ImportError:  # the tool still works, with lighter checks
    _VALIDATOR = None


# ---------- helpers ----------

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def domain(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url if "://" in url else "https://" + url).netloc.lower()
    host = host.split(":")[0]
    return host[4:] if host.startswith("www.") else host or None


def norm_name(name: str) -> str:
    n = slugify(name)
    n = re.sub(r"-(studio|studios|ltd|inc|israel|il|group|productions?|tlv|tel-aviv)$", "", n)
    return n


def ordered(rec: dict) -> dict:
    out = {k: rec[k] for k in FIELD_ORDER if k in rec}
    return out


def load_all() -> dict[str, dict]:
    orgs = {}
    for p in sorted(ORGS.glob("*.json")):
        orgs[p.stem] = json.loads(p.read_text())
    return orgs


def save(rec: dict) -> None:
    ORGS.mkdir(parents=True, exist_ok=True)
    (ORGS / f"{rec['id']}.json").write_text(json.dumps(ordered(rec), ensure_ascii=False, indent=2) + "\n")


def errors_for(rec: dict, filename: str | None = None) -> list[str]:
    errs = []
    if _VALIDATOR:
        errs += [f"{'/'.join(map(str, e.path)) or '(root)'}: {e.message}" for e in _VALIDATOR.iter_errors(rec)]
    for c in rec.get("categories", []):
        if c not in TAXONOMY["categories"]:
            errs.append(f"categories: unknown slug '{c}'")
    if filename and rec.get("id") != filename:
        errs.append(f"id '{rec.get('id')}' does not match file name '{filename}'")
    return errs


# ---------- normalisation & merge ----------

SIZE_FIX = {"2-10": "1-10", "0-1": "1-10", "1-50": "11-50", "10-50": "11-50", "51-100": "51-200",
            "100-200": "51-200", "200-500": "201-500", "500-1000": "501-1000", "1000-5000": "1001-5000",
            "5000+": "5001+", "10001+": "5001+", "5001-10000": "5001+", "10000+": "5001+"}


def normalise(raw: dict) -> tuple[dict, list[str]]:
    warn = []
    rec = {k: v for k, v in raw.items() if v not in (None, "", [], {})}
    unknown = set(rec) - set(FIELD_ORDER)
    if unknown:
        warn.append(f"dropped unknown keys {sorted(unknown)}")
        for k in unknown:
            rec.pop(k)
    rec["id"] = slugify(rec.get("id") or rec.get("name", ""))
    if "size" in rec and rec["size"] not in TAXONOMY["sizes"]:
        fixed = SIZE_FIX.get(str(rec["size"]).replace(" ", ""))
        if fixed:
            rec["size"] = fixed
        else:
            warn.append(f"dropped bad size '{rec['size']}'")
            rec.pop("size")
    if isinstance(rec.get("founded"), str) and rec["founded"].isdigit():
        rec["founded"] = int(rec["founded"])
    cats = [slugify(c) for c in rec.get("categories", [])]
    bad = [c for c in cats if c not in TAXONOMY["categories"]]
    if bad:
        warn.append(f"dropped unknown categories {bad} (moved to tags)")
        rec["tags"] = sorted(set(rec.get("tags", [])) | set(bad))
    rec["categories"] = [c for c in dict.fromkeys(cats) if c in TAXONOMY["categories"]]
    for k in LIST_FIELDS & set(rec):
        rec[k] = list(dict.fromkeys(x.strip() for x in rec[k] if isinstance(x, str) and x.strip()))
    if isinstance(rec.get("links"), dict):
        rec["links"] = {k: v for k, v in rec["links"].items() if isinstance(v, str) and v.startswith("http")}
        if not rec["links"]:
            rec.pop("links")
    rec.setdefault("added", TODAY)
    rec.setdefault("last_verified", TODAY)
    rec.setdefault("status", "active")
    return rec, warn


def merge(old: dict, new: dict) -> dict:
    """Lists are unioned; for scalars the fresher record wins when it has a value."""
    fresher = new.get("last_verified", "") >= old.get("last_verified", "")
    out = dict(old)
    for k, v in new.items():
        if k in ("id", "added", "kind"):
            continue
        if k in LIST_FIELDS:
            out[k] = list(dict.fromkeys((old.get(k) or []) + v))
        elif k == "relations":
            seen = {(r["type"], r["target"]) for r in old.get("relations", [])}
            out[k] = old.get("relations", []) + [r for r in v if (r["type"], r["target"]) not in seen]
        elif k == "key_people":
            names = {p["name"] for p in old.get("key_people", [])}
            out[k] = old.get("key_people", []) + [p for p in v if p["name"] not in names]
        elif isinstance(v, dict) and isinstance(old.get(k), dict):
            out[k] = {**old[k], **v} if fresher else {**v, **old[k]}
        elif k == "confidence":
            out[k] = v if fresher else max(old.get(k, "low"), v, key=CONF_RANK.get)
        elif fresher or k not in old:
            out[k] = v
    return out


def find_match(rec: dict, orgs: dict[str, dict]) -> str | None:
    if rec["id"] in orgs:
        return rec["id"]
    d = domain(rec.get("website"))
    n = norm_name(rec["name"])
    for oid, o in orgs.items():
        if d and d == domain(o.get("website")) and d not in {"facebook.com", "instagram.com", "linkedin.com", "behance.net", "vimeo.com"}:
            return oid
        if (n and n == norm_name(o["name"]) and o.get("kind") == rec.get("kind")
                and o.get("location", {}).get("country") == rec.get("location", {}).get("country")):
            return oid
    return None


# ---------- commands ----------

def cmd_validate(_args) -> int:
    orgs = load_all()
    bad = 0
    domains: dict[str, str] = {}
    for oid, rec in orgs.items():
        errs = errors_for(rec, oid)
        d = domain(rec.get("website"))
        if d and d in domains and d not in {"facebook.com", "instagram.com", "linkedin.com"}:
            errs.append(f"same website as '{domains[d]}' (possible duplicate)")
        elif d:
            domains[d] = oid
        if errs:
            bad += 1
            print(f"✗ {oid}")
            for e in errs:
                print(f"    {e}")
    print(f"{len(orgs) - bad}/{len(orgs)} records valid")
    return 1 if bad else 0


def cmd_ingest(args) -> int:
    orgs = load_all()
    added, updated, rejected = [], [], []
    for path in args.files:
        try:
            items = json.loads(Path(path).read_text())
        except json.JSONDecodeError as e:
            print(f"✗ {path}: invalid JSON ({e})")
            return 1
        if isinstance(items, dict):
            items = [items]
        for raw in items:
            rec, warn = normalise(raw)
            label = rec.get("id") or "?"
            for w in warn:
                print(f"  ! {label}: {w}")
            match = find_match(rec, orgs)
            if match:
                if match != rec["id"]:
                    print(f"  ~ {rec['id']} → merged into existing '{match}'")
                rec["id"] = match
                rec = merge(orgs[match], rec)
            errs = errors_for(rec)
            if errs:
                rejected.append(label)
                print(f"  ✗ {label}: " + "; ".join(errs))
                continue
            (updated if match else added).append(rec["id"])
            orgs[rec["id"]] = rec
            if not args.dry_run:
                save(rec)
    print(f"added {len(added)}, updated {len(updated)}, rejected {len(rejected)}" + (" (dry run)" if args.dry_run else ""))
    return 1 if rejected and args.strict else 0


def resolve_relations(orgs: dict[str, dict]) -> None:
    by_name = {norm_name(o["name"]): oid for oid, o in orgs.items()}
    for o in orgs.values():
        for r in o.get("relations", []):
            t = r["target"]
            r["target_id"] = t if t in orgs else by_name.get(norm_name(t))


def cmd_build(_args) -> int:
    orgs = load_all()
    resolve_relations(orgs)
    out_dir = ROOT / "site" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    dataset = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "count": len(orgs),
        "taxonomy": TAXONOMY,
        "orgs": list(orgs.values()),
    }
    (out_dir / "dataset.json").write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")))
    exp = ROOT / "data" / "exports"
    exp.mkdir(parents=True, exist_ok=True)
    cols = ["id", "name", "name_he", "kind", "categories", "city", "country", "founded", "size", "status",
            "website", "linkedin", "instagram", "description", "notable_clients", "confidence", "last_verified"]
    with open(exp / "landscape.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for o in orgs.values():
            links = o.get("links", {})
            w.writerow([o["id"], o["name"], o.get("name_he", ""), o["kind"], "|".join(o["categories"]),
                        o["location"].get("city", ""), o["location"]["country"], o.get("founded", ""),
                        o.get("size", ""), o.get("status", ""), o.get("website", ""), links.get("linkedin", ""),
                        links.get("instagram", ""), o["description"], "|".join(o.get("notable_clients", [])),
                        o["confidence"], o["last_verified"]])
    write_stats(orgs)
    app = (ROOT / "site" / "app.html").read_text()
    (ROOT / "site" / "index.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
        "body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n"
        "</head>\n<body>\n" + app + "\n</body>\n</html>\n")
    print(f"built dataset with {len(orgs)} orgs → site/data/dataset.json, data/exports/landscape.csv, STATS.md")
    return 0


def cmd_standalone(args) -> int:
    """Single HTML file with the data inlined (for sharing / artifact preview)."""
    cmd_build(args)
    data = (ROOT / "site" / "data" / "dataset.json").read_text().replace("</", "<\\/")
    app = (ROOT / "site" / "app.html").read_text()
    Path(args.out).write_text(app.replace("<script>\n(function", f"<script>window.__LANDSCAPE__={data};</script>\n<script>\n(function", 1))
    print(f"wrote {args.out}")
    return 0


def write_stats(orgs: dict[str, dict]) -> None:
    kinds = Counter(o["kind"] for o in orgs.values())
    cats = Counter(c for o in orgs.values() for c in o["categories"])
    cities = Counter(o["location"].get("city", "—") for o in orgs.values())
    countries = Counter(o["location"]["country"] for o in orgs.values())
    conf = Counter(o["confidence"] for o in orgs.values())
    lines = ["# Landscape stats", "", f"_Generated {TODAY} · {len(orgs)} organizations_", "",
             "## By kind", "", "| Kind | Count |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in kinds.most_common()]
    lines += ["", "## By country", "", "| Country | Count |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in countries.most_common()]
    lines += ["", "## Top cities", "", "| City | Count |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in cities.most_common(15)]
    lines += ["", "## By category", "", "| Category | Count |", "|---|---|"]
    lines += [f"| {TAXONOMY['categories'].get(k, k)} | {v} |" for k, v in cats.most_common()]
    lines += ["", "## Confidence", "", "| Level | Count |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in conf.most_common()]
    (ROOT / "STATS.md").write_text("\n".join(lines) + "\n")


def cmd_stale(args) -> int:
    cutoff = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()
    stale = sorted((o["last_verified"], oid) for oid, o in load_all().items()
                   if o["last_verified"] < cutoff or o["confidence"] == "low")
    for d, oid in stale[: args.limit]:
        print(f"{d}  {oid}")
    print(f"{len(stale)} records older than {args.days} days or low-confidence")
    return 0


def cmd_stats(_args) -> int:
    orgs = load_all()
    write_stats(orgs)
    print((ROOT / "STATS.md").read_text())
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate").set_defaults(fn=cmd_validate)
    i = sub.add_parser("ingest")
    i.add_argument("files", nargs="+")
    i.add_argument("--dry-run", action="store_true")
    i.add_argument("--strict", action="store_true", help="exit 1 if any record is rejected")
    i.set_defaults(fn=cmd_ingest)
    sub.add_parser("build").set_defaults(fn=cmd_build)
    s = sub.add_parser("stale")
    s.add_argument("--days", type=int, default=90)
    s.add_argument("--limit", type=int, default=50)
    s.set_defaults(fn=cmd_stale)
    sub.add_parser("stats").set_defaults(fn=cmd_stats)
    st = sub.add_parser("standalone")
    st.add_argument("out")
    st.set_defaults(fn=cmd_standalone)
    args = p.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
