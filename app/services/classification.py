from app.models.entities import SignDesign
from app.models.enums import DexCategory, Status, Verification
from app.schemas.data import Classification


def classify(sign: SignDesign) -> Classification:
    route = sign.route
    status = route.current_service_status if route else Status.unknown
    category = sign.dex_category_override
    if category is None:
        if status == Status.active:
            category = DexCategory.active
        elif status in {Status.discontinued, Status.historical}:
            category = DexCategory.not_in_service
    reasons = []
    if not route:
        reasons.append("Unknown route assignment")
    if status == Status.unknown:
        reasons.append("Unknown current route status")
    if route and not route.color_group_id:
        reasons.append("Unknown route color group")
    if sign.verification_status != Verification.verified:
        reasons.append(f"Design verification: {sign.verification_status}")
    if sign.manual_review:
        reasons.append("Curator review requested")
    return Classification(
        sign_id=sign.sign_id,
        route_id=sign.route_id,
        color_group_id=route.color_group_id if route else None,
        dex_category=category,
        service_status=status,
        display_name=sign.display_name,
        display_order=sign.display_order,
        requires_manual_review=bool(reasons),
        review_reasons=reasons,
    )
