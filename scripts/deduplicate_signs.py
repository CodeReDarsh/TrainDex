import json

from sqlalchemy.orm import Session

from app.database.session import get_engine
from app.services.validation import duplicate_candidates

if __name__ == "__main__":
    with Session(get_engine()) as session:
        print(json.dumps(duplicate_candidates(session), indent=2))
