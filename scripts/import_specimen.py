"""Build the fixed website catalog and audit every displayed specimen cell.

No network access is required for normal database imports. This optional source
refresh verifies the live page against the pinned per-set mappings before writing.
"""

import argparse
import csv
import hashlib
import html
import json
import re
from datetime import UTC, datetime
from pathlib import Path

from app.schemas.data import Bundle

SPECIMEN_URL = "https://nyumathclinic.github.io/nyc-subway-bullets-font/specimen/"
SETS = {
    "std": ("Standard", "Standard"),
    "helv": ("Helvetica", "Helvetica"),
    "nycta": ("NYCTA", "NYCTA"),
    "r62a": ("R62A", "R62A"),
    "r32": ("R32", "R32"),
    "retired": ("Retired", "Retired"),
    "legacy": ("Legacy", "Legacy"),
    "all": ("All", "All"),
}


def parse_specimen(page: str) -> dict[str, list[dict]]:
    sections = {}
    for set_id, (name, _) in SETS.items():
        anchor = "nyc-subway-bullets-" + name.lower()
        section = re.search(rf'<h2 id="{anchor}">(.*?)(?=<h2 |</article>)', page, re.S)
        if not section:
            raise ValueError(f"Missing website section: {name}")
        rows = []
        for cell in re.findall(
            r'<div class="specimen-cell">(.*?)</div>\s*</div>', section[1], re.S
        ):

            def field(css_class, cell=cell):
                return [
                    html.unescape(re.sub(r"<[^>]+>", "", value)).strip()
                    for value in re.findall(rf'<div class="{css_class}">(.*?)</div>', cell, re.S)
                ]

            key, codepoint, descriptions = (
                field("specimen-key"),
                field("specimen-cp"),
                field("specimen-desc"),
            )
            # The last inner div was consumed by the outer-cell delimiter.
            if len(descriptions) != 2:
                last = re.search(r'<div class="specimen-desc">([^<]*)$', cell)
                if last:
                    descriptions.append(html.unescape(last[1]).strip())
            if len(key) != 1 or len(codepoint) != 1 or len(descriptions) != 2:
                raise ValueError(f"Unexpected specimen markup in {set_id}: {cell[:100]}")
            rows.append(
                {
                    "key": key[0],
                    "codepoint": codepoint[0].removeprefix("U+"),
                    "description": descriptions[0],
                    "service_label": descriptions[1],
                }
            )
        if not rows:
            raise ValueError(f"No entries parsed for {set_id}")
        sections[set_id] = rows
    return sections


def build_specimen(raw_root: Path, page_path: Path) -> tuple[Bundle, dict]:
    page = page_path.read_text()
    sections = parse_specimen(page)
    index = json.loads((raw_root / "svg-index.json").read_text())
    accessed = datetime.fromtimestamp(page_path.stat().st_mtime, UTC).isoformat()
    source_id = "website-specimen"
    sources = [
        {
            "source_id": source_id,
            "title": "NYC Subway Bullets — Specimen",
            "url": SPECIMEN_URL,
            "publisher": "NYU Math Clinic / NYC Subway Bullets Font",
            "source_type": "community",
            "accessed_at": accessed,
            "notes": "Specimen membership and source labels only; includes proposed and unassigned artwork. Per-glyph licenses retained separately.",
        }
    ]
    sets, entries, seen_files, inventory = [], [], set(), []
    for position, (set_id, (name, font_name)) in enumerate(SETS.items()):
        rows = list(csv.DictReader((raw_root / f"bullets-{set_id}.tsv").open(), delimiter="\t"))
        mappings = {row["key"]: row for row in rows}
        website = sections[set_id]
        if (
            len(mappings) != len(rows)
            or len(website) != len(rows)
            or {r["key"] for r in website} != set(mappings)
        ):
            raise ValueError(
                f"Website and pinned mapping keys differ for {set_id}; refresh/review source data"
            )
        sets.append(
            {
                "set_id": set_id,
                "display_name": name,
                "font_file": f"NYCSubwayBullets-{font_name}.ttf",
                "display_order": position,
                "source_id": source_id,
                "source_url": SPECIMEN_URL + "#nyc-subway-bullets-" + name.lower(),
            }
        )
        for order, item in enumerate(website):
            mapping = mappings[item["key"]]
            if (mapping["description"], mapping["service"], mapping["codepoint"]) != (
                item["description"],
                item["service_label"],
                item["codepoint"],
            ):
                raise ValueError(f"Website differs from pinned mapping: {set_id} / {item['key']}")
            filename = mapping["file"]
            record = index["files"][filename]
            sign_id = "ART_" + record["sha256"][:20].upper()
            label = item["service_label"].casefold()
            status = (
                "unassigned"
                if "unassigned" in label
                else "proposed"
                if "proposed" in label
                else "blank"
                if label == "blank"
                else "listed"
            )
            entry = {
                "set_id": set_id,
                **item,
                "sign_id": sign_id,
                "filename": filename,
                "display_order": order,
                "listing_status": status,
                "source_id": source_id,
            }
            entries.append(entry)
            seen_files.add(filename)
            inventory.append(entry)
    combined_files = {r["filename"] for r in entries if r["set_id"] == "all"}
    if combined_files != seen_files:
        raise ValueError("The All section does not cover exactly the distinct referenced files")
    report = {
        "source_url": SPECIMEN_URL,
        "accessed_at": accessed,
        "page_sha256": hashlib.sha256(page_path.read_bytes()).hexdigest(),
        "repository_commit": index["commit"],
        "unique_reference_graphics": len(seen_files),
        "website_listings": len(entries),
        "by_set": {k: len(v) for k, v in sections.items()},
        "missing_listings": [],
        "unexpected_listings": [],
        "entries": inventory,
    }
    return Bundle.model_validate(
        {"sources": sources, "specimen_sets": sets, "specimen_entries": entries}
    ), report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--page", type=Path, required=True, help="Locally downloaded specimen HTML")
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw"))
    args = parser.parse_args()
    bundle, audit = build_specimen(args.raw_root, args.page)
    (args.raw_root.parent / "curated" / "specimen_entries.json").write_text(
        bundle.model_dump_json(indent=2) + "\n"
    )
    (args.raw_root / "specimen_inventory.json").write_text(json.dumps(audit, indent=2) + "\n")
    print(json.dumps({k: v for k, v in audit.items() if k != "entries"}, indent=2))


if __name__ == "__main__":
    main()
