import json
from pathlib import Path

from app.schemas.matching import MatchRequest
from app.services.matching import match_signs
from scripts.build_catalog import build


def test_every_source_photo_has_a_review_decision():
    inventory = json.loads(Path("data/raw/commons-rollsigns.json").read_text())
    reviewed = json.loads(Path("data/raw/category_review.json").read_text())
    assert {p["pageid"] for p in inventory["files"]} == {p["page_id"] for p in reviewed["files"]}
    assert len(reviewed["files"]) == 158


def test_multiple_photos_share_one_manufactured_design():
    bundle = build(Path("data/raw"), Path("data/references"))
    refs = [r for r in bundle.reference_images if r.sign_id == "IRT_7_SIDE_GREEN_RING"]
    assert len(refs) == 6
    assert sum(s.sign_id == "IRT_7_SIDE_GREEN_RING" for s in bundle.signs) == 1


def test_unused_and_film_designs_are_not_invented_routes():
    bundle = build(Path("data/raw"), Path("data/references"))
    signs = {s.sign_id: s for s in bundle.signs}
    for sid in [
        "IRT_11_PURPLE_CIRCLE_SIDE",
        "IRT_12_GREEN_CIRCLE_END",
        "B_P_UNUSED_CIRCLE_SIDE",
        "FILM_0_GOTHAM_PROP",
    ]:
        assert signs[sid].route_id is None
        assert signs[sid].verification_status == "candidate"


def test_svg_typeface_declaration_not_claimed_on_physical_equipment():
    bundle = build(Path("data/raw"), Path("data/references"))
    art = [s for s in bundle.signs if s.font_family]
    assert len(art) == 44
    assert all(
        s.sign_technology == "artwork"
        and s.feature_provenance["font_family"]["basis"] == "source_svg"
        for s in art
    )
    assert not any(link.sign_id.startswith("ART_") for link in bundle.sign_equipment)


def test_estimated_reference_features_reduce_evidence_coverage(db):
    from app.models.entities import SignDesign

    sign = db.get(SignDesign, "TEST_6_CIRCLE")
    sign.feature_provenance = {"background_color": {"basis": "visual_estimate"}}
    result = match_signs(db, MatchRequest(route="6", background_color="#00933C"))
    match = next(m for m in result.matches if m.sign_id == sign.sign_id)
    assert match.evidence_coverage < 1
