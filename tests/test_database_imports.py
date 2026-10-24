import pytest
from pydantic import ValidationError
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import SignDesign, SignObservation
from app.models.enums import Shape
from app.schemas.data import Bundle, ReferenceData, SignData
from app.services.importing import import_bundle, reference_path
from app.services.validation import duplicate_candidates, validate_catalog


def test_tables_and_relationships(engine, db):
    assert {
        "sign_designs",
        "sign_observations",
        "route_group_history",
        "sign_equipment",
        "review_issues",
    } <= set(inspect(engine).get_table_names())
    sign = db.get(SignDesign, "TEST_6_CIRCLE")
    assert sign.route.group.color_group_id == "TEST_GREEN"
    assert sign.equipment[0].train_model_id == "TEST_RETIRED"
    assert sign.evidence[0].source.title == "SYNTHETIC test evidence"


def test_repeatable_import(db, bundle, tmp_path):
    import_bundle(db, bundle, tmp_path)
    db.commit()
    assert db.scalar(select(func.count()).select_from(SignDesign)) == 4


def test_unknown_input_preserves_enriched_metadata(db, bundle, tmp_path):
    sign = db.get(SignDesign, "TEST_6_CIRCLE")
    sign.font_family = "SYNTHETIC documented enrichment"
    db.commit()
    import_bundle(db, bundle, tmp_path)
    assert sign.font_family == "SYNTHETIC documented enrichment"


def test_foreign_key_enforcement(db):
    db.add(
        SignDesign(
            sign_id="BAD", identity_key="bad", sign_text="?", display_name="bad", route_id="MISSING"
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_unique_design_identity(db):
    db.add(
        SignDesign(sign_id="COPY", identity_key="test:6:circle", sign_text="6", display_name="copy")
    )
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


@pytest.mark.parametrize("color", ["green", "#FFF", "#ZZZZZZ", "00933C", "#1234567"])
def test_invalid_colors(color):
    with pytest.raises(ValidationError):
        SignData(
            sign_id="T",
            identity_key="t",
            sign_text="6",
            display_name="Test",
            background_color=color,
        )


def test_missing_required_fields():
    with pytest.raises(ValidationError):
        Bundle.model_validate({"signs": [{"sign_id": "T"}]})


def test_atomic_import_failure(engine, bundle, tmp_path):
    bundle.signs[0].route_id = "MISSING"
    with Session(engine) as session:
        with pytest.raises(IntegrityError), session.begin():
            import_bundle(session, bundle, tmp_path)
        assert session.scalar(select(func.count()).select_from(SignDesign)) == 0


def test_verified_requires_evidence(engine, tmp_path):
    bundle = Bundle.model_validate(
        {
            "signs": [
                {
                    "sign_id": "T",
                    "identity_key": "t",
                    "sign_text": "6",
                    "display_name": "Test",
                    "verification_status": "verified",
                }
            ]
        }
    )
    with (
        Session(engine) as session,
        pytest.raises(ValueError, match="no verified"),
        session.begin(),
    ):
        import_bundle(session, bundle, tmp_path)


def test_duplicate_input_rejected(db, bundle, tmp_path):
    bundle.signs.append(bundle.signs[0])
    with pytest.raises(ValueError, match="Duplicate identity"):
        import_bundle(db, bundle, tmp_path)


def test_conflicts_not_silently_overwritten(db, bundle, tmp_path):
    bundle.signs[0].shape = Shape.diamond
    with pytest.raises(ValueError, match="Conflicting"):
        import_bundle(db, bundle, tmp_path)
    db.rollback()
    import_bundle(db, bundle, tmp_path, allow_updates=True)
    assert db.get(SignDesign, "TEST_6_CIRCLE").manual_review


@pytest.mark.parametrize("path", ["../escape.jpg", "/tmp/escape.jpg"])
def test_path_traversal(tmp_path, path):
    with pytest.raises(ValueError):
        reference_path(tmp_path, path)


def image_bundle(**changes):
    data = {
        "image_id": "TEST_IMAGE",
        "sign_id": "TEST_6_CIRCLE",
        "source_id": "TEST_SOURCE",
        "source_url": "https://example.org/test.jpg",
        "image_type": "authentic_photograph",
        "file_path": "test.jpg",
        "license": "CC0",
        "attribution": "Synthetic test fixture",
        "checksum": "0" * 64,
    }
    return Bundle(reference_images=[ReferenceData(**(data | changes))])


def test_missing_reference_file(db, tmp_path):
    with pytest.raises(ValueError, match="Missing reference file"):
        import_bundle(db, image_bundle(), tmp_path)


def test_reference_attribution_required(db, tmp_path):
    with pytest.raises(ValueError, match="license, attribution"):
        import_bundle(db, image_bundle(attribution=None), tmp_path)


def test_reference_checksum(db, tmp_path):
    (tmp_path / "test.jpg").write_bytes(b"SYNTHETIC test file")
    with pytest.raises(ValueError, match="checksum mismatch"):
        import_bundle(db, image_bundle(), tmp_path)


def test_image_observation_must_share_design(db, tmp_path):
    import_bundle(db, image_bundle(file_path=None, checksum=None), tmp_path)
    db.add(SignObservation(observation_id="TEST_OBS", sign_id="TEST_V", image_id="TEST_IMAGE"))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_validation_warns_about_unknowns(db, tmp_path):
    result = validate_catalog(db, tmp_path)
    assert result["valid"]
    assert any("unknown route" in warning for warning in result["warnings"])
    assert duplicate_candidates(db) == []
