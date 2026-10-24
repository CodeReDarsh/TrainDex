from collections import Counter
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import (
    ReferenceImage,
    ReviewIssue,
    Route,
    RouteGroup,
    SignDesign,
    Source,
    TrainModel,
)
from app.models.enums import Verification
from app.services.classification import classify


def coverage(session: Session) -> dict:
    signs = session.scalars(select(SignDesign).order_by(SignDesign.sign_id)).all()
    unresolved = set(
        session.scalars(select(ReviewIssue.sign_id).where(ReviewIssue.resolved.is_(False)))
    )
    by_route, by_group, by_tech, by_model = Counter(), Counter(), Counter(), Counter()
    missing, review, inactive, historical, images, verified, candidates = [], [], 0, 0, 0, 0, 0
    for sign in signs:
        c = classify(sign)
        by_route[sign.route_id or "unknown"] += 1
        by_group[c.color_group_id or "unknown"] += 1
        by_tech[sign.sign_technology.value] += 1
        for link in sign.equipment:
            if link.verification_status == Verification.verified:
                by_model[link.train_model_id] += 1
        verified += sign.verification_status == Verification.verified
        candidates += sign.verification_status == Verification.candidate
        inactive += c.dex_category == "not_in_service"
        historical += sign.is_historical
        images += bool(sign.references)
        if not any(e.verification_status == Verification.verified for e in sign.evidence):
            missing.append(sign.sign_id)
        if c.requires_manual_review or sign.sign_id in unresolved:
            review.append(sign.sign_id)
    count = lambda model: session.scalar(select(func.count()).select_from(model))
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "total_distinct_designs": len(signs),
        "verified_designs": verified,
        "unverified_candidates": candidates,
        "other_unverified_designs": len(signs) - verified - candidates,
        "routes": count(Route),
        "route_groups": count(RouteGroup),
        "train_models": count(TrainModel),
        "sources": count(Source),
        "reference_images": count(ReferenceImage),
        "by_route": dict(sorted(by_route.items())),
        "by_color_group": dict(sorted(by_group.items())),
        "not_in_service_designs": inactive,
        "by_sign_technology": dict(sorted(by_tech.items())),
        "by_verified_train_model": dict(sorted(by_model.items())),
        "historical_designs": historical,
        "designs_with_reference_images": images,
        "designs_with_local_reference_files": sum(
            any(r.file_path for r in s.references) for s in signs
        ),
        "designs_missing_source_verification": missing,
        "designs_requiring_manual_review": review,
        "coverage_notice": "Initial evidence-based catalog; not a comprehensive census. Photographs are not design counts. Reconstructed datasets are staged separately.",
    }


def markdown_report(report: dict) -> str:
    lines = [
        "# TrainDex database coverage",
        "",
        f"Generated: {report['generated_at']}",
        "",
        report["coverage_notice"],
        "",
    ]
    for key, value in report.items():
        if key in {"generated_at", "coverage_notice"}:
            continue
        if isinstance(value, dict):
            lines += [
                f"## {key.replace('_', ' ').title()}",
                "",
                "| Category | Designs |",
                "|---|---:|",
            ]
            lines += [f"| {k} | {v} |" for k, v in value.items()]
        elif isinstance(value, list):
            lines += [
                f"- **{key.replace('_', ' ')}:** {len(value)}"
                + (f" ({', '.join(value)})" if value else "")
            ]
        else:
            lines += [f"- **{key.replace('_', ' ')}:** {value}"]
        lines.append("")
    return "\n".join(lines)
