"""Build the reviewed production import bundle from retained source snapshots.

Pure offline transformation. New upstream artwork/photographs never become designs
without an explicit entry in curation.json and review of its supporting evidence.
"""

import argparse
import json
from pathlib import Path

from app.schemas.data import Bundle


def build(raw_root: Path, reference_root: Path, include_local=False, specimen_only=False) -> Bundle:
    raw = lambda name: json.loads((raw_root / name).read_text())
    retrievals = raw("retrievals.json")
    sources, groups, routes, trains = ([] for _ in range(4))
    accessed = retrievals["commons.json"]["accessed_at"]

    def source(
        source_id,
        title,
        url,
        source_type,
        publisher=None,
        license=None,
        notes=None,
        author=None,
        at=None,
    ):
        sources.append(
            {
                "source_id": source_id,
                "title": title,
                "url": url,
                "source_type": source_type,
                "publisher": publisher,
                "author": author,
                "accessed_at": at or accessed,
                "license": license,
                "notes": notes,
            }
        )

    source(
        "mta-colors",
        "MTA Colors",
        "https://data.ny.gov/resource/3uhz-sej2.json",
        "official_specification",
        "Metropolitan Transportation Authority",
        at=retrievals["colors.json"]["accessed_at"],
        notes="Current official digital route group colors; not a physical rollsign paint specification. Different from older commonly circulated HEX values.",
    )
    source(
        "mta-routes",
        "MTA Text Maps for Subway Lines",
        "https://www.mta.info/maps/subway-line-maps",
        "official_specification",
        "Metropolitan Transportation Authority",
        notes="Route operation and descriptive names checked 2026-10-24. S covers three separate shuttles; it is a designation, not one operational line.",
    )
    source(
        "mta-stock",
        "MTA Subway Rolling Stock",
        "https://data.ny.gov/resource/kir5-i9xt.json",
        "official_specification",
        "Metropolitan Transportation Authority",
        at=retrievals["stock.json"]["accessed_at"],
        notes="Inventory contains conflicting divisions, object descriptions and retirement states. Only model identifiers and unambiguous divisions imported. In-service dates of individual cars are not model introduction dates.",
    )
    source(
        "commons-bullet-history",
        "New York City Subway bullets: historical overview",
        "https://commons.wikimedia.org/wiki/New_York_City_Subway_bullets",
        "community",
        "Wikimedia Commons",
        notes="Community historical narrative supporting retired designations. Not manufacturer documentation; exact historical dates omitted.",
    )
    source(
        "r32-retirement",
        "New York City Transit to Retire R-32s After 58 Years of Service",
        "https://apps.cio.ny.gov/apps/mediacontact/public/view.cfm?parm=12753DF1-CBC4-F293-E86500F6AF3BFA31_563F3423-F74E-DA2D-7B014B68912BDB37",
        "historical_documentation",
        "Metropolitan Transportation Authority / New York State",
        notes="Official announcement supports Budd manufacture and final January 2022 retirement; contradicts active flags in the open inventory.",
    )
    definitions = {
        "A,C,E": ("blue", "8th Avenue"),
        "B,D,F,M": ("orange", "6th Avenue"),
        "4,5,6": ("green", "Lexington Avenue"),
        "1,2,3": ("red", "Broadway–7th Avenue"),
        "7": ("purple", "Flushing"),
        "N,Q,R,W": ("yellow", "Broadway"),
        "J,Z": ("brown", "Nassau Street"),
        "G": ("light_green", "Crosstown"),
        "L": ("gray", "Canarsie"),
        "S": ("shuttle_gray", "Shuttles"),
    }
    colors = {
        row["service"]: row["hex_color"]
        for row in raw("colors.json")
        if row["operator"] == "New York City Subway"
    }
    names = {
        "1": "Broadway–7th Avenue Local",
        "2": "7th Avenue Express",
        "3": "7th Avenue Express",
        "4": "Lexington Avenue Express",
        "5": "Lexington Avenue Express",
        "6": "Lexington Avenue Local / Pelham Express",
        "7": "Flushing Local / Express",
        "A": "8th Avenue Express",
        "B": "6th Avenue Express",
        "C": "8th Avenue Local",
        "D": "6th Avenue Express",
        "E": "8th Avenue Local",
        "F": "6th Avenue Local",
        "G": "Crosstown Local",
        "J": "Nassau Street Express",
        "L": "Canarsie Local",
        "M": "6th Avenue / Myrtle Avenue Local",
        "N": "Broadway Express",
        "Q": "Broadway Express",
        "R": "Broadway Local",
        "S": "Shuttle designation (three services)",
        "W": "Broadway Local",
        "Z": "Nassau Street Express",
    }
    order = 0
    for index, (service, (group_id, name)) in enumerate(definitions.items()):
        groups.append(
            {
                "color_group_id": group_id,
                "group_name": name,
                "display_name": name,
                "hex_color": colors[service],
                "display_order": index,
                "source_id": "mta-colors",
            }
        )
        for route in service.split(","):
            order += 1
            routes.append(
                {
                    "route_id": route,
                    "route_name": names[route],
                    "color_group_id": group_id,
                    "current_service_status": "active",
                    "display_order": order,
                    "source_id": "mta-routes",
                }
            )
    groups.append(
        {
            "color_group_id": "historical_jfk",
            "group_name": "JFK Express (historical)",
            "display_name": "JFK Express",
            "hex_color": None,
            "is_active": False,
            "source_id": "commons-bullet-history",
        }
    )
    for route, group_id, name in [
        ("9", "red", "Former 9 designation"),
        ("K", "blue", "Former 8th Avenue K"),
        ("V", "orange", "Former 6th Avenue V"),
        ("JFK_EXPRESS", "historical_jfk", "JFK Express"),
    ]:
        routes.append(
            {
                "route_id": route,
                "route_name": name,
                "color_group_id": group_id,
                "current_service_status": "discontinued",
                "source_id": "commons-bullet-history",
            }
        )
    for row in raw("stock.json")["models"]:
        model = row["car_class"]
        trains.append(
            {
                "train_model_id": model,
                "model_name": model,
                "division": row["divisions"][0] if len(row["divisions"]) == 1 else None,
                "service_status": "unknown",
                "source_id": "mta-stock",
                "description": "Verified inventory model identifier; current service status and model introduction year not inferred from individual-car records."
                + (
                    " Conflicting division records require review."
                    if len(row["divisions"]) != 1
                    else ""
                ),
            }
        )
        if model == "R32":
            trains[-1].update(
                manufacturer="Budd Company",
                introduction_year=1964,
                retirement_year=2022,
                service_status="historical",
                source_id="r32-retirement",
                description="Retired R32; official retirement announcement takes precedence over contradictory inventory active flags.",
            )
    from scripts.build_physical_catalog import build_physical

    physical = (
        Bundle()
        if specimen_only
        else build_physical(
            raw_root, reference_root, include_local, {m["train_model_id"] for m in trains}
        )
    )
    base = Bundle.model_validate(
        {"sources": sources, "route_groups": groups, "routes": routes, "train_models": trains}
    )
    artwork_path = raw_root.parent / "curated" / "artwork_patterns.json"
    artwork = Bundle.model_validate_json(artwork_path.read_text())
    if include_local:
        for reference in artwork.reference_images:
            relative = f"artwork/{reference.checksum}.svg"
            if (reference_root / relative).is_file():
                reference.file_path = relative
    specimen = Bundle.model_validate_json(
        (raw_root.parent / "curated" / "specimen_entries.json").read_text()
    )
    combined = {}
    for section in Bundle.model_fields:
        combined[section] = [
            *getattr(base, section),
            *getattr(physical, section),
            *getattr(artwork, section),
            *getattr(specimen, section),
        ]
    return Bundle.model_validate(combined)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-root", type=Path, default=Path("data/raw"))
    parser.add_argument("--reference-root", type=Path, default=Path("data/references"))
    parser.add_argument("--include-local-files", action="store_true")
    parser.add_argument(
        "--specimen-only",
        action="store_true",
        help="Include exactly the 275 website graphics, without additional photographic designs",
    )
    parser.add_argument("--output", type=Path, default=Path("data/processed/catalog.json"))
    args = parser.parse_args()
    bundle = build(args.raw_root, args.reference_root, args.include_local_files, args.specimen_only)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(bundle.model_dump_json(indent=2) + "\n")
    print(f"Wrote {len(bundle.signs)} curated signs to {args.output}")


if __name__ == "__main__":
    main()
