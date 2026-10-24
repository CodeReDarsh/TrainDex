"""All test identifiers and evidence below are SYNTHETIC, never production seeds."""

import os
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.session import build_engine, get_session
from app.main import app
from app.models.entities import Base
from app.schemas.data import Bundle
from app.services.importing import import_bundle


@pytest.fixture
def bundle():
    return Bundle.model_validate(
        {
            "sources": [
                {
                    "source_id": "TEST_SOURCE",
                    "title": "SYNTHETIC test evidence",
                    "url": "https://example.org/test-only",
                    "source_type": "unverified_observation",
                    "accessed_at": datetime(2026, 1, 1, tzinfo=UTC),
                }
            ],
            "route_groups": [
                {
                    "color_group_id": "TEST_GREEN",
                    "group_name": "Test green",
                    "display_name": "Test green",
                    "hex_color": "#00933C",
                }
            ],
            "routes": [
                {
                    "route_id": "6",
                    "route_name": "Test 6",
                    "color_group_id": "TEST_GREEN",
                    "current_service_status": "active",
                },
                {"route_id": "V", "route_name": "Test V", "current_service_status": "discontinued"},
            ],
            "train_models": [
                {
                    "train_model_id": "TEST_RETIRED",
                    "model_name": "Synthetic retired equipment",
                    "service_status": "historical",
                }
            ],
            "signs": [
                {
                    "sign_id": "TEST_6_CIRCLE",
                    "identity_key": "test:6:circle",
                    "route_id": "6",
                    "sign_text": "6",
                    "display_name": "Test circle 6",
                    "shape": "circle",
                    "background_color": "#00933C",
                    "foreground_color": "#FFFFFF",
                    "sign_technology": "rollsign",
                    "verification_status": "verified",
                },
                {
                    "sign_id": "TEST_6_DIAMOND",
                    "identity_key": "test:6:diamond",
                    "route_id": "6",
                    "sign_text": "6",
                    "display_name": "Test diamond 6",
                    "shape": "diamond",
                    "background_color": "#00933C",
                    "foreground_color": "#FFFFFF",
                    "sign_technology": "rollsign",
                    "is_historical": True,
                },
                {
                    "sign_id": "TEST_V",
                    "identity_key": "test:v",
                    "route_id": "V",
                    "sign_text": "V",
                    "display_name": "Test V",
                    "shape": "circle",
                    "background_color": "#FF6319",
                },
                {
                    "sign_id": "TEST_UNKNOWN",
                    "identity_key": "test:unknown",
                    "sign_text": "?",
                    "display_name": "Test unknown",
                },
            ],
            "sign_sources": [
                {
                    "sign_id": "TEST_6_CIRCLE",
                    "source_id": "TEST_SOURCE",
                    "claim": "SYNTHETIC fixture claim",
                    "verification_status": "verified",
                }
            ],
            "sign_equipment": [
                {
                    "sign_id": "TEST_6_CIRCLE",
                    "train_model_id": "TEST_RETIRED",
                    "source_id": "TEST_SOURCE",
                    "verification_status": "verified",
                }
            ],
        }
    )


@pytest.fixture
def engine(tmp_path):
    engine = build_engine(os.environ.get("TEST_BACKEND_URL", f"sqlite:///{tmp_path / 'test.db'}"))
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(engine, bundle, tmp_path):
    with Session(engine) as session:
        with session.begin():
            import_bundle(session, bundle, tmp_path)
        yield session


@pytest.fixture
def client(db):
    app.dependency_overrides[get_session] = lambda: db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
