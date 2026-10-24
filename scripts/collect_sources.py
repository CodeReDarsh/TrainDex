"""Fetch source snapshots. No database writes or arbitrary remote code execution.

The font repository is pinned; live MTA/Commons refreshes require a new curated review.
Downloads only explicitly selected Commons assets under an allowlisted free license.
"""

import argparse
import csv
import hashlib
import io
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

import httpx

PIN = "1d2a6b05bf5ea7ec43c6ed608d1eb739f16089e4"
BASE = f"https://raw.githubusercontent.com/nyumathclinic/nyc-subway-bullets-font/{PIN}"
TITLES = [
    "An R62A rollsign with LED green circle.jpg",
    "An R62A rollsign with LED red diamond.jpg",
    "Brown diamond R vc.jpg",
    "R68A V Train.jpg",
    "R62 3 train Rollsign @ Franklin Avenue.jpg",
    "R62A 6 Train 033.jpg",
    "R68 B Train Rollsign.jpg",
    "R68A G Train Rollsign.jpg",
    "R68 W Train Rollsign.jpg",
    "Diamond Q vc.jpg",
    "JFK Express Sign.jpg",
    "K train in museum vc.jpg",
    "R62A Times Square Shuttle 023.jpg",
    "7 train red diamond express lcd.JPG",
    "10 train.jpg",
    "13 train in Line 1.jpg",
]
FREE_LICENSES = {
    "Public domain",
    "CC0",
    "CC BY 2.0",
    "CC BY 3.0",
    "CC BY 4.0",
    "CC BY-SA 2.0",
    "CC BY-SA 3.0",
    "CC BY-SA 4.0",
}


def fetch_snapshots(root: Path, refresh=False):
    root.mkdir(parents=True, exist_ok=True)
    log_path = root / "retrievals.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    with httpx.Client(
        timeout=60,
        follow_redirects=True,
        headers={
            "User-Agent": "TrainDex/0.1 (https://github.com/CodeReDarsh/TrainDex; reference research)"
        },
    ) as client:

        def fetch(name, url, params=None):
            path = root / name
            if path.exists() and not refresh and name in log:
                return
            response = client.get(url, params=params)
            response.raise_for_status()
            payload = response.content
            if name == "stock.json":
                full_path = root / "downloads" / "stock-full.json"
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_bytes(payload)
                # Keep only factual model aggregates in the shared snapshot, not 10k car records.
                rows = response.json()
                if len(rows) >= 50000:
                    raise ValueError(
                        "Rolling-stock API limit reached; add pagination before importing"
                    )
                grouped = {}
                for row in rows:
                    key = row["car_class"]
                    item = grouped.setdefault(
                        key, {"car_class": key, "divisions": set(), "in_service": 0, "retired": 0}
                    )
                    if row.get("division"):
                        item["divisions"].add(row["division"])
                    item[
                        "in_service" if row.get("retirement_date") == "In-Service" else "retired"
                    ] += 1
                payload = json.dumps(
                    {
                        "source_rows": len(rows),
                        "models": [
                            {**v, "divisions": sorted(v["divisions"])}
                            for _, v in sorted(grouped.items())
                        ],
                    },
                    indent=2,
                ).encode()
            path.write_bytes(payload)
            log[name] = {
                "url": str(response.url),
                "accessed_at": datetime.now(UTC).isoformat(),
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
            log_path.write_text(json.dumps(log, indent=2) + "\n")

        fetch("colors.json", "https://data.ny.gov/resource/3uhz-sej2.json")
        fetch("stock.json", "https://data.ny.gov/resource/kir5-i9xt.json", {"$limit": 50000})
        fetch(
            "commons.json",
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query",
                "format": "json",
                "titles": "|".join("File:" + t for t in TITLES),
                "prop": "imageinfo",
                "iiprop": "url|size|sha1|extmetadata",
                "iiurlwidth": 640,
            },
        )
        fetch("bullets-manifest.json", BASE + "/sources/manifest.json")
        for set_id in ("std", "helv", "nycta", "r62a", "r32", "retired", "legacy"):
            fetch(f"bullets-{set_id}.tsv", BASE + f"/data/mappings/{set_id}.tsv")
        fetch("bullets-data-license.txt", BASE + "/LICENSES/CC0-1.0.txt")
    log_path.write_text(json.dumps(log, indent=2) + "\n")


def stage_bullets(root: Path, output: Path):
    manifest = json.loads((root / "bullets-manifest.json").read_text())["files"]
    candidates = {}
    for file in sorted(root.glob("bullets-*.tsv")):
        for row in csv.DictReader(io.StringIO(file.read_text()), delimiter="\t"):
            item = candidates.setdefault(
                row["file"],
                {
                    "mapping": row,
                    "sets": [],
                    "source": manifest.get(row["file"]),
                    "review_status": "unreviewed_artwork",
                    "manufactured_design_confirmed": False,
                },
            )
            item["sets"].append(file.stem.removeprefix("bullets-"))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "repository_commit": PIN,
                "notice": "Reconstructed artwork; no automatic inference of physical sign, font, dates, route status, or equipment compatibility.",
                "unique_artwork_files": len(candidates),
                "candidates": list(candidates.values()),
            },
            indent=2,
        )
        + "\n"
    )


def download_photos(root: Path, reference_root: Path):
    pages = json.loads((root / "commons.json").read_text())["query"]["pages"]
    with httpx.Client(
        timeout=60,
        follow_redirects=True,
        headers={
            "User-Agent": "TrainDex/0.1 (https://github.com/CodeReDarsh/TrainDex; reference research)"
        },
    ) as client:
        for page in pages.values():
            if not page.get("imageinfo"):
                raise ValueError(f"Missing image information: {page['title']}")
            info = page["imageinfo"][0]
            license_name = info["extmetadata"].get("LicenseShortName", {}).get("value")
            if license_name not in FREE_LICENSES:
                raise ValueError(f"License requires manual review: {page['title']} {license_name}")
            url = info["url"]
            if urlparse(url).hostname != "upload.wikimedia.org":
                raise ValueError("Unexpected asset host")
            path = reference_root / "commons" / f"{page['pageid']}.jpg"
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                time.sleep(5)  # Be conservative with Wikimedia's shared download service.
                response = client.get(url)
                response.raise_for_status()
                path.write_bytes(response.content)
            if hashlib.sha1(path.read_bytes()).hexdigest() != info["sha1"]:
                raise ValueError(f"Upstream SHA-1 mismatch: {path}")
            print(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw"))
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--download-images", action="store_true")
    parser.add_argument("--reference-root", type=Path, default=Path("data/references"))
    args = parser.parse_args()
    fetch_snapshots(args.raw_root, args.refresh)
    stage_bullets(args.raw_root, Path("data/processed/artwork_review_queue.json"))
    if args.download_images:
        download_photos(args.raw_root, args.reference_root)


if __name__ == "__main__":
    main()
