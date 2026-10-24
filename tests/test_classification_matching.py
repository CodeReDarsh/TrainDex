import pytest
from pydantic import ValidationError

from app.models.entities import SignDesign
from app.schemas.matching import MatchRequest
from app.services.classification import classify
from app.services.matching import delta_e, hex_to_lab, match_signs
from app.services.reporting import coverage


def test_active_historical_design_and_retired_equipment(db):
    assert classify(db.get(SignDesign, "TEST_6_CIRCLE")).dex_category == "active"
    assert classify(db.get(SignDesign, "TEST_6_DIAMOND")).dex_category == "active"
    assert classify(db.get(SignDesign, "TEST_6_CIRCLE")).color_group_id == "TEST_GREEN"


def test_discontinued_and_unknown(db):
    assert classify(db.get(SignDesign, "TEST_V")).dex_category == "not_in_service"
    unknown = classify(db.get(SignDesign, "TEST_UNKNOWN"))
    assert unknown.dex_category is None
    assert unknown.requires_manual_review


def test_verified_override_is_independent_of_route_status(db):
    sign = db.get(SignDesign, "TEST_V")
    sign.dex_category_override = "active"
    sign.override_source_id = "TEST_SOURCE"
    sign.override_reason = "SYNTHETIC exceptional classification"
    db.flush()
    assert classify(sign).dex_category == "active"
    assert classify(sign).service_status == "discontinued"


def test_color_is_not_classification(db):
    sign = db.get(SignDesign, "TEST_6_CIRCLE")
    sign.background_color = "#FF0000"
    assert classify(sign).color_group_id == "TEST_GREEN"


def test_perceptual_distance():
    assert delta_e("#00933C", "#00933C") == 0
    assert delta_e("#00933C", "#00943D") < delta_e("#00933C", "#FF0000")
    assert hex_to_lab("#FFFFFF")[0] == pytest.approx(100, abs=0.001)
    assert hex_to_lab("#000000")[0] == pytest.approx(0)
    assert delta_e("#FFFFFF", "#000000") == pytest.approx(100, abs=0.001)


def test_shape_ranking(db):
    result = match_signs(db, MatchRequest(route="6", shape="diamond", background_color="#00953E"))
    assert result.matches[0].sign_id == "TEST_6_DIAMOND"
    assert "shape" in result.matches[0].matching_features
    assert "shape" in result.matches[1].conflicting_features
    assert "font_family" in result.matches[0].uncertain_features


def test_missing_attributes_not_mismatches(db):
    result = match_signs(db, MatchRequest(route="6", font_family="Unrecognized font"))
    assert all(m.similarity_score == 1 for m in result.matches)
    assert all("font_family" in m.uncertain_features for m in result.matches)
    assert all(m.evidence_coverage < 1 for m in result.matches)


def test_unknown_equipment(db):
    result = match_signs(db, MatchRequest(route="6", train_model="UNKNOWN_MODEL"))
    assert all("train_model" in m.uncertain_features for m in result.matches)
    assert all(m.similarity_score == 1 for m in result.matches)


def test_equipment_support_and_normalization(db):
    result = match_signs(db, MatchRequest(route="6", train_model="test_retired"))
    assert result.matches[0].sign_id == "TEST_6_CIRCLE"
    assert "train_model" in result.matches[0].matching_features


def test_no_match(db):
    assert match_signs(db, MatchRequest(route="NOPE")).matches == []


def test_conflicting_features_and_relaxed_route(db):
    result = match_signs(db, MatchRequest(route="V", shape="diamond", strict_route=False))
    assert result.matches[0].sign_id == "TEST_V"
    assert "shape" in result.matches[0].conflicting_features
    assert "route" in result.matches[1].conflicting_features


def test_uncertain_route_does_not_exclude(db):
    result = match_signs(db, MatchRequest(route="V", shape="diamond", confidence={"route": 0.2}))
    assert result.matches[0].sign_id == "TEST_6_DIAMOND"


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"route": None},
        {"shape": "unknown"},
        {"route": "6", "confidence": {"bogus": 1}},
        {"route": "6", "confidence": {"route": -1}},
        {"route": "6", "confidence": {"route": 0}},
    ],
)
def test_invalid_match_queries(data):
    with pytest.raises(ValidationError):
        MatchRequest(**data)


def test_score_threshold_and_weight_configuration(db):
    assert (
        match_signs(db, MatchRequest(route="6", shape="diamond", min_score=0.99)).matches[0].sign_id
        == "TEST_6_DIAMOND"
    )
    result = match_signs(db, MatchRequest(route="6", shape="diamond", weights={"shape": 0}))
    assert all(m.similarity_score == 1 for m in result.matches)


def test_coverage_counts_designs(db):
    report = coverage(db)
    assert report["total_distinct_designs"] == 4
    assert report["verified_designs"] == 1
    assert report["reference_images"] == 0
    assert report["not_in_service_designs"] == 1
    assert report["historical_designs"] == 1
