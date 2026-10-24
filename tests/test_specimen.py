import json
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.main import app
from app.models.entities import SignDesign, SpecimenEntry
from app.schemas.data import Bundle
from app.services.importing import import_bundle
from scripts.complete_artwork_colors import svg_color


def test_every_website_listing_is_retained_without_duplicate_graphics():
    inventory = json.loads(Path("data/raw/specimen_inventory.json").read_text())
    bundle = Bundle.model_validate_json(Path("data/processed/catalog.json").read_text())
    actual = {
        (e.set_id, e.key, e.codepoint, e.sign_id, e.service_label) for e in bundle.specimen_entries
    }
    expected = {
        (e["set_id"], e["key"], e["codepoint"], e["sign_id"], e["service_label"])
        for e in inventory["entries"]
    }
    assert actual == expected
    assert len(actual) == 647
    assert len({entry.sign_id for entry in bundle.specimen_entries}) == 275
    assert {s.set_id for s in bundle.specimen_sets} == {
        "std",
        "helv",
        "nycta",
        "r62a",
        "r32",
        "retired",
        "legacy",
        "all",
    }
    assert inventory["missing_listings"] == inventory["unexpected_listings"] == []


def test_proposed_unassigned_and_blank_labels_are_preserved():
    bundle = Bundle.model_validate_json(Path("data/processed/catalog.json").read_text())
    entries = {(e.set_id, e.key): e for e in bundle.specimen_entries}
    assert entries[("std", "T")].listing_status == "proposed"
    assert entries[("std", "13")].listing_status == "unassigned"
    assert entries[("std", "-")].listing_status == "blank"
    assert entries[("std", "6")].sign_id == entries[("r62a", "6")].sign_id
    assert entries[("std", "6")].sign_id != entries[("helv", "6")].sign_id


def test_actual_svg_percentage_and_default_colors():
    assert svg_color("rgb(0%,20%,67.058825%)") == "#0033AB"
    assert svg_color("black") == "#000000"
    assert svg_color("#fff") == "#FFFFFF"
    bundle = Bundle.model_validate_json(Path("data/processed/catalog.json").read_text())
    art = [s for s in bundle.signs if s.sign_technology == "artwork"]
    assert all(s.background_color for s in art)
    assert sum(s.foreground_color is None for s in art) == 2  # Blank bullets have no character.


def test_populated_specimen_roundtrip_and_api(engine, tmp_path):
    bundle = Bundle.model_validate_json(Path("data/processed/catalog.json").read_text())
    with Session(engine) as session:
        with session.begin():
            import_bundle(session, bundle, tmp_path)
        with session.begin():
            import_bundle(session, bundle, tmp_path)
        assert session.scalar(select(func.count()).select_from(SpecimenEntry)) == 647
        assert session.scalar(select(func.count()).select_from(SignDesign)) == 323
        app.dependency_overrides[get_session] = lambda: session
        try:
            with TestClient(app) as client:
                assert client.get("/specimen-sets").json()["total"] == 8
                assert client.get("/specimen-entries?set_id=r62a").json()["total"] == 18
                assert client.get("/specimen-sets/all/signs?limit=1").json()["total"] == 275
                assert client.get("/signs?specimen_set=nycta&limit=1").json()["total"] == 52
                response = client.post(
                    "/signs/match", json={"route": "6", "shape": "diamond", "specimen_set": "r62a"}
                )
                assert response.status_code == 200, response.text
                top = response.json()["matches"][0]["sign"]
                assert "r62a" in top["style_families"]
                assert top["reference_kind"] == "reconstructed_artwork"
                assert any(e["key"] == "6d" for e in top["specimen_entries"])
                assert client.get("/specimen-sets/missing/signs").status_code == 404
        finally:
            app.dependency_overrides.clear()
