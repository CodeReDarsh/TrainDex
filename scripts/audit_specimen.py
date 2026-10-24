"""Audit the populated database against every retained website listing."""

import json
from collections import Counter
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_engine
from app.models.entities import SpecimenEntry


def audit(session: Session, inventory: dict) -> dict:
    expected = {(e["set_id"], e["key"]): e for e in inventory["entries"]}
    actual = {(e.set_id, e.key): e for e in session.scalars(select(SpecimenEntry))}
    missing = sorted(set(expected) - set(actual))
    unexpected = sorted(set(actual) - set(expected))
    mismatches = []
    for identity in set(expected) & set(actual):
        for field in (
            "sign_id",
            "codepoint",
            "description",
            "service_label",
            "filename",
            "listing_status",
        ):
            if expected[identity][field] != getattr(actual[identity], field):
                mismatches.append({"set_id": identity[0], "key": identity[1], "field": field})
    return {
        "source_url": inventory["source_url"],
        "source_page_sha256": inventory["page_sha256"],
        "unique_website_graphics": len({e.sign_id for e in actual.values()}),
        "website_listings_expected": len(expected),
        "website_listings_imported": len(actual),
        "by_set": dict(sorted(Counter(e.set_id for e in actual.values()).items())),
        "missing_listings": missing,
        "unexpected_listings": unexpected,
        "metadata_mismatches": sorted(
            mismatches, key=lambda m: (m["set_id"], m["key"], m["field"])
        ),
        "complete": not missing and not unexpected and not mismatches,
    }


def main():
    inventory = json.loads(Path("data/raw/specimen_inventory.json").read_text())
    with Session(get_engine()) as session:
        result = audit(session, inventory)
    Path("reports/specimen-coverage.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = [
        "# Specimen website coverage",
        "",
        f"Source: {result['source_url']}",
        "",
        f"Unique reference graphics: **{result['unique_website_graphics']}**. Imported website listings: **{result['website_listings_imported']} / {result['website_listings_expected']}**.",
        "",
        "| Set | Listings |",
        "|---|---:|",
        *[f"| {key} | {count} |" for key, count in result["by_set"].items()],
        "",
        f"Missing: {len(result['missing_listings'])}. Unexpected: {len(result['unexpected_listings'])}. Metadata mismatches: {len(result['metadata_mismatches'])}.",
        "",
        "Shared graphics are deduplicated across sets. Proposed, unassigned and blank labels remain source labels, not claims of operating service or physical manufacture.",
    ]
    Path("reports/specimen-coverage.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["complete"] else 1)


if __name__ == "__main__":
    main()
