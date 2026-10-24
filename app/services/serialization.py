from sqlalchemy.orm import Session

from app.models.entities import SignDesign
from app.schemas.data import (
    ReferenceData,
    ReviewData,
    SignData,
    SignEquipmentData,
    SignOut,
    SignSourceData,
    SpecimenEntryData,
)
from app.services.classification import classify


def sign_out(session: Session, sign: SignDesign) -> SignOut:
    issues = sign.reviews
    classification = classify(sign)
    unresolved = [issue for issue in issues if not issue.resolved]
    if unresolved:
        classification.requires_manual_review = True
        classification.review_reasons.extend(issue.description for issue in unresolved)
    return SignOut(
        **SignData.model_validate(sign).model_dump(),
        reference_kind="reconstructed_artwork"
        if sign.sign_technology == "artwork"
        else "physical_sign",
        created_at=sign.created_at,
        updated_at=sign.updated_at,
        classification=classification,
        reference_images=[ReferenceData.model_validate(x) for x in sign.references],
        sources=[SignSourceData.model_validate(x) for x in sign.evidence],
        equipment=[SignEquipmentData.model_validate(x) for x in sign.equipment],
        review_issues=[ReviewData.model_validate(x) for x in issues],
        specimen_entries=[
            SpecimenEntryData.model_validate(x)
            for x in sorted(sign.specimen_entries, key=lambda e: (e.set_id, e.display_order))
        ],
        style_families=sorted({e.set_id for e in sign.specimen_entries if e.set_id != "all"}),
    )
