import hashlib
import re
from collections import defaultdict
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ReferenceImage, SignDesign
from app.models.enums import Verification
from app.services.importing import reference_path


def validate_catalog(session: Session, reference_root: Path) -> dict:
    errors, warnings = [], []
    for sign in session.scalars(select(SignDesign)):
        for field in ("background_color", "foreground_color"):
            value = getattr(sign, field)
            if value and not re.fullmatch(r"#[0-9A-Fa-f]{6}", value):
                errors.append(f"{sign.sign_id}: invalid {field}")
        if not sign.evidence:
            warnings.append(f"{sign.sign_id}: no supporting sources")
        if sign.verification_status == Verification.verified and not any(
            e.verification_status == Verification.verified for e in sign.evidence
        ):
            errors.append(f"{sign.sign_id}: verified without verified evidence")
        if sign.verification_status != Verification.verified:
            warnings.append(f"{sign.sign_id}: {sign.verification_status}")
        if not sign.references:
            warnings.append(f"{sign.sign_id}: no reference image metadata")
        if not sign.route_id:
            warnings.append(f"{sign.sign_id}: unknown route; manual review required")
    for image in session.scalars(select(ReferenceImage)):
        if not image.license or not image.attribution:
            warnings.append(f"{image.image_id}: incomplete license/attribution; do not download")
        if image.file_path:
            try:
                path = reference_path(reference_root, image.file_path)
                if not path.is_file():
                    errors.append(f"{image.image_id}: reference file missing")
                elif hashlib.sha256(path.read_bytes()).hexdigest() != image.checksum:
                    errors.append(f"{image.image_id}: checksum mismatch")
            except ValueError as exc:
                errors.append(f"{image.image_id}: {exc}")
    return {"errors": errors, "warnings": warnings, "valid": not errors}


def duplicate_candidates(session: Session) -> list[dict]:
    """Advisory only: matching metadata is insufficient evidence to merge designs."""
    buckets = defaultdict(list)
    for s in session.scalars(select(SignDesign).order_by(SignDesign.sign_id)):
        key = (
            s.sign_text.casefold(),
            s.shape,
            s.background_color,
            s.foreground_color,
            s.font_family,
            s.font_variant,
            s.layout,
            s.sign_technology,
            s.design_family,
        )
        buckets[key].append(s.sign_id)
    return [
        {"sign_ids": ids, "action": "Review evidence; never merge automatically"}
        for ids in buckets.values()
        if len(ids) > 1
    ]
