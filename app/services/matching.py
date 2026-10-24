"""Weighted retrieval with CIELAB ΔE76 color distance (sRGB, D65)."""

from math import exp, sqrt

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import SignDesign, SpecimenEntry
from app.models.enums import Verification
from app.schemas.matching import FeatureResult, Match, MatchRequest, MatchResponse
from app.services.serialization import sign_out


def hex_to_lab(color: str) -> tuple[float, float, float]:
    rgb = [int(color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    r, g, b = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    xyz = [
        (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047,
        0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
        (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883,
    ]
    x, y, z = [v ** (1 / 3) if v > (6 / 29) ** 3 else v / (3 * (6 / 29) ** 2) + 4 / 29 for v in xyz]
    return (116 * y - 16, 500 * (x - y), 200 * (y - z))


def delta_e(a: str, b: str) -> float:
    return sqrt(sum((x - y) ** 2 for x, y in zip(hex_to_lab(a), hex_to_lab(b), strict=True)))


def normalize(value: str) -> str:
    return value.strip().casefold()


def match_signs(session: Session, query: MatchRequest) -> MatchResponse:
    settings = get_settings()
    statement = select(SignDesign)
    if not query.include_artwork:
        statement = statement.where(SignDesign.sign_technology != "artwork")
    if query.specimen_set:
        statement = statement.where(
            SignDesign.specimen_entries.any(SpecimenEntry.set_id == query.specimen_set)
        )
    weights = query.weights.model_dump()
    # A low-confidence route remains supporting evidence, avoiding premature exclusion.
    if (
        query.route
        and query.strict_route
        and weights["route"] * query.confidence.get("route", 1) > 0
        and query.confidence.get("route", 1) >= 0.8
    ):
        token = normalize(query.route)
        statement = statement.where(
            or_(func.lower(SignDesign.sign_text) == token, func.lower(SignDesign.route_id) == token)
        )
    available = session.scalar(select(func.count()).select_from(statement.subquery()))
    signs = session.scalars(
        statement.order_by(SignDesign.sign_id).limit(settings.match_max_candidates)
    ).all()
    matches = []
    requested_weight = sum(
        w * query.confidence.get(k, 1)
        for k, w in weights.items()
        if getattr(query, k) not in (None, "unknown")
    )
    for sign in signs:
        numerator = denominator = 0.0
        matched, conflicting, uncertain, results = [], [], [], []
        for feature, base_weight in weights.items():
            value = getattr(query, feature)
            weight = base_weight * query.confidence.get(feature, 1)
            if value in (None, "unknown") or not weight:
                uncertain.append(feature)
                continue
            actual = getattr(sign, feature, None)
            provenance = sign.feature_provenance.get(feature, {})
            if provenance.get("basis") == "visual_estimate":
                weight *= 0.5
            similarity = None
            reason = "Reference attribute is unknown"
            if feature == "route":
                similarity = float(
                    normalize(value) in {normalize(sign.sign_text), normalize(sign.route_id or "")}
                )
                reason = "Compared displayed text and associated route"
            elif feature == "train_model":
                evidence = [
                    e
                    for e in sign.equipment
                    if normalize(e.train_model_id) == normalize(value)
                    and e.verification_status == Verification.verified
                ]
                if evidence:
                    similarity, reason = 1.0, "Documented equipment compatibility"
                else:
                    reason = "No verified compatibility for this equipment; absence is not incompatibility"
            elif sign.sign_technology == "artwork" and feature in {
                "sign_technology",
                "font_family",
            }:
                reason = "Reconstructed artwork does not establish physical display technology or original train typeface"
            elif actual not in (None, "unknown"):
                if feature.endswith("_color"):
                    distance = delta_e(value, actual)
                    scale = query.color_delta_e or settings.match_color_delta_e
                    similarity = exp(-0.5 * (distance / scale) ** 2)
                    reason = f"CIELAB ΔE76={distance:.3f}; Gaussian scale={scale:g}"
                else:
                    similarity = float(normalize(str(value)) == normalize(str(actual)))
                    reason = f"Compared with reference value {actual!s}"
            if similarity is None:
                uncertain.append(feature)
            else:
                numerator += weight * similarity
                denominator += weight
                (matched if similarity >= 0.75 else conflicting).append(feature)
            results.append(
                FeatureResult(feature=feature, similarity=similarity, explanation=reason)
            )
        if not denominator:
            continue
        score = numerator / denominator
        if score < query.min_score or numerator <= 0:
            continue
        output = sign_out(session, sign)
        matches.append(
            Match(
                sign_id=sign.sign_id,
                similarity_score=round(score, 6),
                evidence_coverage=round(denominator / requested_weight, 6),
                matching_features=matched,
                conflicting_features=conflicting,
                uncertain_features=uncertain,
                feature_results=results,
                classification=output.classification.model_dump(mode="json"),
                reference_images=[r.model_dump(mode="json") for r in output.reference_images],
                sign=output,
            )
        )
    matches.sort(key=lambda m: (-m.similarity_score, -m.evidence_coverage, m.sign_id))
    return MatchResponse(
        matches=matches[: query.limit],
        candidates_considered=len(signs),
        candidates_available=available,
        truncated=available > len(signs),
    )
