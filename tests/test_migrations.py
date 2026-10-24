import os
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import inspect

from alembic import command
from app.database.session import build_engine
from app.models.entities import Base


def check_migrations(url):
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.attributes["database_url"] = url
    engine = build_engine(url)
    command.upgrade(config, "head")
    command.check(config)
    assert set(Base.metadata.tables) <= set(inspect(engine).get_table_names())
    command.downgrade(config, "base")
    assert "sign_designs" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    engine.dispose()


def test_sqlite_migration_roundtrip(tmp_path):
    check_migrations(f"sqlite:///{tmp_path / 'migrations.db'}")


@pytest.mark.postgres
def test_postgres_migration_roundtrip():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database")
    check_migrations(url)
