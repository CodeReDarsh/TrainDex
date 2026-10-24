from sqlalchemy.orm import Session

from app.models.entities import SignDesign
from app.schemas.data import (
    ReferenceData,
    ReviewData,
    SignData,
    SignEquipmentData,
    SignOut,
    SignSourceData,
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
        created_at=sign.created_at,
        updated_at=sign.updated_at,
        classification=classification,
        reference_images=[ReferenceData.model_validate(x) for x in sign.references],
        sources=[SignSourceData.model_validate(x) for x in sign.evidence],
        equipment=[SignEquipmentData.model_validate(x) for x in sign.equipment],
        review_issues=[ReviewData.model_validate(x) for x in issues],
    )
