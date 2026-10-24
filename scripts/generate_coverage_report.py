import argparse
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.database.session import get_engine
from app.services.reporting import coverage, markdown_report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("reports"))
    args = parser.parse_args()
    with Session(get_engine()) as session:
        report = coverage(session)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "coverage.json").write_text(json.dumps(report, indent=2) + "\n")
    (args.output / "coverage.md").write_text(markdown_report(report))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
