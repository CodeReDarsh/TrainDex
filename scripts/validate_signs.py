import json

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import get_engine
from app.services.validation import validate_catalog


def main():
    with Session(get_engine()) as session:
        result = validate_catalog(session, get_settings().reference_root)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
