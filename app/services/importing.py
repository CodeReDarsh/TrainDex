"""Validated, atomic, idempotent imports. CLI owns the transaction boundary."""

import hashlib
from datetime import datetime
from pathlib import Path

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.models import entities as m
from app.models.enums import Verification
from app.schemas.data import Bundle

TABLES = {
    "sources": m.Source,
    "route_groups": m.RouteGroup,
    "routes": m.Route,
    "train_models": m.TrainModel,
    "signs": m.SignDesign,
    "sign_sources": m.SignSource,
    "sign_equipment": m.SignEquipment,
    "reference_images": m.ReferenceImage,
    "observations": m.SignObservation,
    "route_group_history": m.RouteGroupHistory,
    "review_issues": m.ReviewIssue,
}


def reference_path(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(root.resolve()):
        raise ValueError("Reference path must be relative and stay inside REFERENCE_ROOT")
    return path


def import_bundle(
    session: Session,
    bundle: Bundle,
    reference_root: Path,
    sections: list[str] | None = None,
    allow_updates: bool = False,
) -> dict:
    counts = {}
    for section, model in TABLES.items():
        if sections is not None and section not in sections:
            continue
        records = getattr(bundle, section)
        primary = [column.name for column in inspect(model).primary_key]
        seen = set()
        for record in records:
            values = record.model_dump(mode="python")
            for key in ("url", "source_url"):
                if key in values:
                    values[key] = str(values[key])
            for key in ("hex_color", "background_color", "foreground_color"):
                if values.get(key):
                    values[key] = values[key].upper()
            identity = tuple(values[key] for key in primary)
            if identity in seen:
                raise ValueError(f"Duplicate identity in input: {section} {identity}")
            seen.add(identity)
            if section == "reference_images" and values.get("file_path"):
                if not (values["license"] and values["attribution"] and values["checksum"]):
                    raise ValueError("Local references require license, attribution, and SHA-256")
                path = reference_path(reference_root, values["file_path"])
                if not path.is_file():
                    raise ValueError(f"Missing reference file: {path}")
                if hashlib.sha256(path.read_bytes()).hexdigest() != values["checksum"]:
                    raise ValueError(f"Reference checksum mismatch: {path}")
            existing = session.get(model, identity[0] if len(identity) == 1 else identity)
            if existing is None:
                session.add(model(**values))
            else:
                # Compare dates with timezone normalized for SQLite's test adapter.
                changes = {}
                for key, value in values.items():
                    old = getattr(existing, key)
                    if value is None and old is not None and not allow_updates:
                        continue  # An unknown input must not erase a previous enrichment.
                    equivalent = old == value or (
                        isinstance(old, datetime)
                        and isinstance(value, datetime)
                        and old.replace(tzinfo=None) == value.replace(tzinfo=None)
                    )
                    if not equivalent:
                        changes[key] = (old, value)
                if changes and not allow_updates:
                    raise ValueError(
                        f"Conflicting {section} {identity}: {list(changes)}; review before --allow-updates"
                    )
                if changes and section == "signs":
                    for key, (old, new) in changes.items():
                        issue_id = (
                            "conflict:"
                            + hashlib.sha256(f"{identity}:{key}:{old}:{new}".encode()).hexdigest()[
                                :40
                            ]
                        )
                        session.merge(
                            m.ReviewIssue(
                                issue_id=issue_id,
                                sign_id=existing.sign_id,
                                field_name=key,
                                description=f"Import changed {old!r} to {new!r}; review evidence.",
                            )
                        )
                    values["manual_review"] = True
                for key, value in values.items():
                    if value is None and getattr(existing, key) is not None and not allow_updates:
                        continue
                    if getattr(existing, key) != value:
                        setattr(existing, key, value)
        session.flush()
        counts[section] = len(records)
    # Refresh eager-loaded collections after adding evidence in the same transaction.
    session.expire_all()
    for sign in session.scalars(select(m.SignDesign)):
        if sign.verification_status == Verification.verified and not any(
            e.verification_status == Verification.verified for e in sign.evidence
        ):
            raise ValueError(f"Verified design {sign.sign_id} has no verified supporting claim")
    return counts
