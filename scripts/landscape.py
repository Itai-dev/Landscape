#!/usr/bin/env python3
"""Landscape data tool.

  python3 scripts/landscape.py validate            # check every record in data/orgs
  python3 scripts/landscape.py ingest FILE...      # merge staging JSON arrays into data/orgs
  python3 scripts/landscape.py build               # write site/data/dataset.json + exports
  python3 scripts/landscape.py stale [--days 90]   # records due for re-verification
  python3 scripts/landscape.py stats               # counts by kind / category / city
  python3 scripts/landscape.py logos [--all]       # fetch missing logos (needs Pillow)
  python3 scripts/landscape.py signals FILE...     # merge new signals into data/signals/
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
LOGOS = ROOT / "data" / "logos"
LOGO_MANIFEST = LOGOS / "manifest.json"
SCHEMA = json.loads((ROOT / "schema" / "org.schema.json").read_text())
TAXONOMY = json.loads((ROOT / "schema" / "taxonomy.json").read_text())
NEEDS = json.loads((ROOT / "schema" / "needs.json").read_text())["needs"]
SIGNAL_SCHEMA = json.loads((ROOT / "schema" / "signal.schema.json").read_text())
SIGNALS = ROOT / "data" / "signals"
FIELD_ORDER = list(SCHEMA["properties"].keys())
LIST_FIELDS = {"aka", "categories", "services", "notable_clients", "notable_work", "tags", "sources"}
CONF_RANK = {"low": 0, "medium": 1, "high": 2}
TODAY = dt.date.today().isoformat()

try:
    import jsonschema

    _VALIDATOR = jsonschema.Draft202012Validator(SCHEMA, format_checker=jsonschema.FormatChecker())
    _SIG_VALIDATOR = jsonschema.Draft202012Validator(SIGNAL_SCHEMA, format_checker=jsonschema.FormatChecker())
except ImportError:  # the tool still works, with lighter checks
    _VALIDATOR = _SIG_VALIDATOR = None


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
    sigs = load_signals()
    ids = set()
    for sig in sigs:
        errs = signal_errors(sig, orgs)
        if sig["id"] in ids:
            errs.append("duplicate id")
        ids.add(sig["id"])
        if errs:
            bad += 1
            print(f"✗ signal {sig['id']}: " + "; ".join(errs))
    print(f"{len(sigs)} signals checked")
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


def logo_data_uri(path: Path) -> str:
    """64px WebP when Pillow is available (≈4x smaller), else the stored PNG."""
    import base64
    import io
    try:
        from PIL import Image
        im = Image.open(path).convert("RGBA")
        im.thumbnail((64, 64), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=82, method=6)
        return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def cmd_build(_args) -> int:
    orgs = load_all()
    resolve_relations(orgs)
    import base64
    logos = {}
    for oid, o in orgs.items():
        o["needs"] = org_needs(o)
        if (LOGOS / f"{oid}.png").exists():
            logos[oid] = logo_data_uri(LOGOS / f"{oid}.png")
    out_dir = ROOT / "site" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    dataset = {
        "schema_version": TAXONOMY.get("schema_version", 1),
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "count": len(orgs),
        "taxonomy": TAXONOMY,
        "needs": {k: {"label": v["label"], "crafts": v["crafts"]} for k, v in NEEDS.items()},
        "orgs": list(orgs.values()),
    }
    compact = dict(ensure_ascii=False, separators=(",", ":"))
    (out_dir / "dataset.json").write_text(json.dumps(dataset, **compact))
    sigs = sorted(load_signals(), key=lambda x: x["date"], reverse=True)
    (out_dir / "signals.json").write_text(json.dumps({"generated": dataset["generated"], "signals": sigs}, **compact))
    (out_dir / "logos.json").write_text(json.dumps(logos, **compact))
    shutil_old = ROOT / "site" / "logos"
    if shutil_old.exists():
        import shutil
        shutil.rmtree(shutil_old)
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
    print(f"built {len(orgs)} orgs, {len(sigs)} signals, {len(logos)} logos → site/data/, data/exports/landscape.csv, STATS.md")
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


# ---------- signals ----------

def load_signals() -> list[dict]:
    out = []
    for p in sorted(SIGNALS.glob("*.json")):
        out += json.loads(p.read_text())
    return out


def signal_errors(sig: dict, orgs: dict) -> list[str]:
    errs = []
    if _SIG_VALIDATOR:
        errs += [f"{'/'.join(map(str, e.path)) or '(root)'}: {e.message}" for e in _SIG_VALIDATOR.iter_errors(sig)]
    for oid in [sig.get("org_id")] + sig.get("related_ids", []):
        if oid and oid not in orgs:
            errs.append(f"unknown org id '{oid}'")
    return errs


def signal_id(sig: dict) -> str:
    import hashlib
    slug = sig.get("org_id") or slugify(sig["org_name"])[:40].strip("-")
    return f"sig-{sig['date']}-{slug}-{hashlib.sha1(sig['source_url'].encode()).hexdigest()[:6]}"


def cmd_signals(args) -> int:
    """Merge a staging array of signals into data/signals/YYYY-MM.json (dedupe by id)."""
    orgs = load_all()
    by_name = {norm_name(o["name"]): oid for oid, o in orgs.items()}
    existing = {s["id"] for s in load_signals()}
    added, rejected = 0, 0
    for path in args.files:
        for raw in json.loads(Path(path).read_text()):
            sig = {k: v for k, v in raw.items() if v not in (None, "", [], {})}
            sig.setdefault("added", TODAY)
            sig["v"] = 1
            if not sig.get("org_id"):
                sig["org_id"] = by_name.get(norm_name(sig.get("org_name", "")))
            sig["id"] = signal_id(sig)
            if sig["id"] in existing:
                continue
            errs = signal_errors(sig, orgs)
            if errs:
                rejected += 1
                print(f"  ✗ {sig['id']}: " + "; ".join(errs))
                continue
            month = SIGNALS / f"{sig['date'][:7]}.json"
            cur = json.loads(month.read_text()) if month.exists() else []
            cur.append(sig)
            cur.sort(key=lambda x: x["date"], reverse=True)
            SIGNALS.mkdir(parents=True, exist_ok=True)
            if not args.dry_run:
                month.write_text(json.dumps(cur, ensure_ascii=False, indent=2) + "\n")
            existing.add(sig["id"])
            added += 1
    print(f"signals: added {added}, rejected {rejected}" + (" (dry run)" if args.dry_run else ""))
    return 1 if rejected and args.strict else 0


def org_needs(o: dict) -> list[str]:
    text = [n.lower() for n in o.get("client_profile", {}).get("creative_needs", [])]
    return [k for k, v in NEEDS.items() if any(re.search(m, t) for m in v["match"] for t in text)]


# ---------- logos ----------

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
LOGO_PX = 96


def _get(url: str, timeout: int = 10) -> tuple[bytes, str]:
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(3_000_000), r.geturl()


def _icon_candidates(site: str) -> list[str]:
    """Icon URLs declared in the homepage <head>, best first."""
    from html.parser import HTMLParser
    from urllib.parse import urljoin
    try:
        html, final = _get(site)
    except Exception:
        return []
    found = []

    class P(HTMLParser):
        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            rel = (a.get("rel") or "").lower()
            href = a.get("href")
            if tag != "link" or not href or "icon" not in rel or "mask" in rel:
                return
            sizes = a.get("sizes") or ""
            m = re.findall(r"(\d+)x\d+", sizes)
            px = max(map(int, m)) if m else (180 if "apple" in rel else 32)
            if href.lower().split("?")[0].endswith(".svg"):
                px = -1  # can't rasterise SVG without extra deps; keep as last resort
            found.append((px, urljoin(final, href)))

    try:
        P().feed(html.decode("utf-8", "ignore")[:400_000])
    except Exception:
        pass
    found.sort(key=lambda t: -t[0])
    return [u for px, u in found if px >= 0] + [urljoin(final, "/apple-touch-icon.png")]


def _to_png(data: bytes) -> bytes | None:
    import io
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        if getattr(im, "format", "") == "ICO":
            im.size = max(im.ico.sizes())  # largest frame
        im = im.convert("RGBA")
    except Exception:
        return None
    if min(im.size) < 32:
        return None
    bbox = im.getbbox()
    if not bbox:
        return None
    im = im.crop(bbox)
    im.thumbnail((LOGO_PX, LOGO_PX), Image.LANCZOS)
    canvas = Image.new("RGBA", (LOGO_PX, LOGO_PX), (0, 0, 0, 0))
    canvas.paste(im, ((LOGO_PX - im.width) // 2, (LOGO_PX - im.height) // 2), im)
    out = io.BytesIO()
    canvas.save(out, "PNG", optimize=True)
    return out.getvalue()


def fetch_logo(rec: dict) -> tuple[str, str | None, bytes | None]:
    site = rec.get("website")
    if not site:
        return rec["id"], None, None
    d = domain(site)
    tries = _icon_candidates(site) + [
        f"https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{d}&size=128"]
    for url in tries:
        try:
            data, _ = _get(url, timeout=8)
        except Exception:
            continue
        png = _to_png(data)
        if png:
            return rec["id"], url, png
    return rec["id"], None, None


def cmd_logos(args) -> int:
    from concurrent.futures import ThreadPoolExecutor
    LOGOS.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(LOGO_MANIFEST.read_text()) if LOGO_MANIFEST.exists() else {}
    orgs = load_all()
    todo = [o for oid, o in orgs.items() if args.all or (oid not in manifest and not (LOGOS / f"{oid}.png").exists())]
    if args.ids:
        todo = [orgs[i] for i in args.ids if i in orgs]
    got = 0
    with ThreadPoolExecutor(16) as pool:
        for oid, url, png in pool.map(fetch_logo, todo):
            if png:
                (LOGOS / f"{oid}.png").write_bytes(png)
                manifest[oid] = {"source": url, "fetched": TODAY}
                got += 1
            else:
                manifest.setdefault(oid, {"source": None, "fetched": TODAY})
    LOGO_MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n")
    print(f"logos: fetched {got}/{len(todo)}; total with logo: {len(list(LOGOS.glob('*.png')))}/{len(orgs)}")
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
    lg = sub.add_parser("logos")
    lg.add_argument("--all", action="store_true", help="re-fetch every logo")
    lg.add_argument("ids", nargs="*", help="only these org ids")
    lg.set_defaults(fn=cmd_logos)
    sg = sub.add_parser("signals")
    sg.add_argument("files", nargs="+")
    sg.add_argument("--dry-run", action="store_true")
    sg.add_argument("--strict", action="store_true")
    sg.set_defaults(fn=cmd_signals)
    args = p.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
