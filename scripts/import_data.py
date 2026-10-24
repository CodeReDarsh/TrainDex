"""Run with python -m scripts.import_data; section wrappers share this implementation."""

import argparse
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import get_engine
from app.schemas.data import Bundle
from app.services.importing import TABLES, import_bundle


def main(default_sections=None):
    parser = argparse.ArgumentParser(
        description="Atomically import a validated TrainDex JSON bundle"
    )
    parser.add_argument("file", nargs="?", type=Path, default=Path("data/processed/catalog.json"))
    parser.add_argument("--sections", nargs="+", choices=list(TABLES), default=default_sections)
    parser.add_argument(
        "--allow-updates",
        action="store_true",
        help="Apply reviewed changes; sign changes create review issues",
    )
    args = parser.parse_args()
    bundle = Bundle.model_validate_json(args.file.read_text())
    with Session(get_engine()) as session, session.begin():
        counts = import_bundle(
            session, bundle, get_settings().reference_root, args.sections, args.allow_updates
        )
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
