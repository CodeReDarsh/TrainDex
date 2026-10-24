"""Materialize explicit reviewed design records and their many photo observations."""

import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import quote

from app.schemas.data import Bundle


def build_physical(
    raw_root: Path, reference_root: Path, include_local: bool, known_models: set[str]
) -> Bundle:
    inventory = json.loads((raw_root / "commons-rollsigns.json").read_text())
    pages = {p["title"][5:]: p for p in inventory["files"]}
    curation = json.loads((raw_root / "curation.json").read_text())
    signs, sources, claims, images, observations, issues, equipment, models = ([] for _ in range(8))
    linked, model_ids = set(), set(known_models)
    for row in curation["designs"]:
        sid = row["sign_id"]
        primary_source = f"commons-{pages[row['file']]['pageid']}"
        status = "candidate" if row.get("candidate") else "verified"
        provenance = {}
        for feature in ("background_color", "foreground_color", "font_style"):
            if row.get(feature):
                provenance[feature] = {
                    "basis": "visual_estimate",
                    "source_id": primary_source,
                    "notes": "Approximate photographic retrieval descriptor; not a verified manufacturer specification.",
                }
        signs.append(
            {
                "sign_id": sid,
                "identity_key": f"curated:{sid.lower()}",
                "route_id": row.get("route"),
                "sign_text": row["text"],
                "display_name": row.get("display_name", sid.replace("_", " ")),
                "shape": row["shape"],
                "background_color": row.get("background_color"),
                "foreground_color": row.get("foreground_color"),
                "font_style": row.get("font_style"),
                "font_family": None,
                "feature_provenance": provenance,
                "border_style": row.get("border_style"),
                "sign_technology": row["technology"],
                "layout": row.get(
                    "layout",
                    "side_route_and_destination"
                    if row["position"] == "side"
                    else "end_route_bullet",
                ),
                "service_type": row.get("service", "unknown"),
                "is_historical": row.get("historical", False),
                "design_family": "photographically_documented_rollsigns",
                "description": "; ".join(row["features"]),
                "distinguishing_features": row["features"],
                "verification_status": status,
                "manual_review": bool(row.get("candidate")),
            }
        )
        for attachment in [row, *row.get("additional_references", [])]:
            page = pages[attachment["file"]]
            info = page["imageinfo"][0]
            metadata = info["extmetadata"]

            def value(key, metadata=metadata):
                return (
                    html.unescape(
                        re.sub(r"<[^>]+>", "", metadata.get(key, {}).get("value", ""))
                    ).strip()
                    or None
                )

            source_id = f"commons-{page['pageid']}"
            url = "https://commons.wikimedia.org/wiki/File:" + quote(
                attachment["file"].replace(" ", "_"), safe="()"
            )
            candidate = row.get("candidate") or attachment.get("candidate")
            verification = "candidate" if candidate else "verified"
            sources.append(
                {
                    "source_id": source_id,
                    "title": attachment["file"],
                    "url": url,
                    "publisher": "Wikimedia Commons",
                    "author": value("Artist"),
                    "source_type": "photographic_evidence",
                    "accessed_at": inventory["accessed_at"],
                    "license": value("LicenseShortName"),
                    "notes": f"Description: {value('ImageDescription')}. Raw date: {value('DateTimeOriginal')}. Visible design evidence only; no manufacturing dates or original color/typeface claims.",
                }
            )
            claims.append(
                {
                    "sign_id": sid,
                    "source_id": source_id,
                    "verification_status": verification,
                    "claim": "Photographic evidence of visible character, shape and assembly; color swatches and descriptive font style are explicitly approximate. "
                    + "; ".join(row["features"]),
                }
            )
            path = reference_root / "commons" / f"{page['pageid']}.jpg"
            local = include_local and path.is_file()
            images.append(
                {
                    "image_id": source_id,
                    "sign_id": sid,
                    "source_id": source_id,
                    "source_url": info["url"],
                    "file_path": f"commons/{page['pageid']}.jpg" if local else None,
                    "image_format": "png"
                    if attachment["file"].lower().endswith(".png")
                    else "jpeg",
                    "image_type": "authentic_photograph",
                    "view_angle": attachment.get(
                        "view_angle", attachment.get("position", row["position"])
                    ),
                    "photographer": value("Artist"),
                    "license": value("LicenseShortName"),
                    "attribution": f"{value('Artist')}; {attachment['file']}; {url}; {value('LicenseShortName')}; {value('LicenseUrl') or 'see source license'}; unmodified original.",
                    "verification_status": verification,
                    "width": info["width"],
                    "height": info["height"],
                    "checksum": hashlib.sha256(path.read_bytes()).hexdigest() if local else None,
                }
            )
            # An unidentified extra photograph does not inherit a primary photo's equipment.
            model = attachment.get("equipment")
            if model and model not in model_ids:
                models.append(
                    {
                        "train_model_id": model,
                        "model_name": model,
                        "source_id": source_id,
                        "description": "Model explicitly named in the cited photograph; manufacturer, years, division and current service status remain unknown.",
                    }
                )
                model_ids.add(model)
            if model and (sid, model) not in linked:
                equipment.append(
                    {
                        "sign_id": sid,
                        "train_model_id": model,
                        "source_id": source_id,
                        "verification_status": "verified",
                        "notes": "Explicitly identified in source photograph title or description; no fleet-wide compatibility inferred.",
                    }
                )
                linked.add((sid, model))
            observations.append(
                {
                    "observation_id": f"obs:{source_id}",
                    "sign_id": sid,
                    "image_id": source_id,
                    "observed_route": attachment.get("observed_route"),
                    "observed_train_model": model,
                    "sign_position": attachment.get("position", row["position"]),
                    "verification_status": verification,
                    "notes": attachment.get(
                        "observation_notes",
                        "Photographic sign setting, not proof of operating service. Raw source dates preserved without inventing timestamps.",
                    ),
                }
            )
        if row.get("candidate"):
            issues.append(
                {
                    "issue_id": f"review:{sid}",
                    "sign_id": sid,
                    "source_id": primary_source,
                    "description": "Provisional design identity or route classification. Review the photographic source; unused, special, altered and film-prop settings are not automatically operating routes.",
                }
            )
        if sid == "IRT_7_SIDE_RED_DIAMOND":
            issues.append(
                {
                    "issue_id": f"review:{sid}:technology",
                    "sign_id": sid,
                    "source_id": primary_source,
                    "field_name": "sign_technology",
                    "description": "Source filename says LCD; hybrid assembly retained without asserting an independently verified LED/LCD subtype.",
                }
            )
    return Bundle.model_validate(
        {
            "sources": sources,
            "signs": signs,
            "sign_sources": claims,
            "reference_images": images,
            "observations": observations,
            "review_issues": issues,
            "sign_equipment": equipment,
            "train_models": models,
        }
    )
