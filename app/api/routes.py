from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.models.entities import (
    ReferenceImage,
    Route,
    RouteGroup,
    SignDesign,
    SignEquipment,
    Source,
    SpecimenEntry,
    SpecimenSet,
    TrainModel,
)
from app.models.enums import Shape, Technology, Verification
from app.schemas.data import (
    Page,
    ReferenceData,
    RouteData,
    RouteGroupData,
    SignOut,
    SourceData,
    SpecimenEntryData,
    SpecimenSetData,
    TrainModelData,
)
from app.schemas.matching import MatchRequest, MatchResponse, SearchQuery
from app.services.matching import match_signs
from app.services.reporting import coverage
from app.services.serialization import sign_out

router = APIRouter()
DB = Annotated[Session, Depends(get_session)]
Limit = Annotated[int, Query(ge=1, le=200)]
Offset = Annotated[int, Query(ge=0)]


def require(session, model, key):
    entity = session.get(model, key)
    if entity is None:
        raise HTTPException(404, "Record not found")
    return entity


def page(session, statement, schema, limit, offset):
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    rows = session.scalars(statement.limit(limit).offset(offset)).unique().all()
    items = [
        sign_out(session, row) if schema is SignOut else schema.model_validate(row) for row in rows
    ]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/health")
def health(db: DB) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
        db.execute(text("SELECT version_num FROM alembic_version"))
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable or migrations not applied") from None
    return {"status": "ok"}


@router.get("/stats")
def stats(db: DB) -> dict:
    return coverage(db)


@router.get("/signs", response_model=Page[SignOut])
def signs(
    db: DB,
    limit: Limit = 50,
    offset: Offset = 0,
    route_id: str | None = None,
    shape: Shape | None = None,
    sign_technology: Technology | None = None,
    verification_status: Verification | None = None,
    color_group_id: str | None = None,
    train_model: str | None = None,
    specimen_set: str | None = None,
):
    statement = select(SignDesign)
    for key, value in {
        "route_id": route_id,
        "shape": shape,
        "sign_technology": sign_technology,
        "verification_status": verification_status,
    }.items():
        if value is not None:
            statement = statement.where(getattr(SignDesign, key) == value)
    if color_group_id:
        statement = statement.join(Route).where(Route.color_group_id == color_group_id)
    if train_model:
        statement = statement.where(
            SignDesign.equipment.any(SignEquipment.train_model_id == train_model)
        )
    if specimen_set:
        statement = statement.where(
            SignDesign.specimen_entries.any(SpecimenEntry.set_id == specimen_set)
        )
    return page(db, statement.order_by(SignDesign.sign_id), SignOut, limit, offset)


# Register static search/match routes before /signs/{sign_id}.
@router.get("/signs/search", response_model=MatchResponse)
def search(db: DB, query: Annotated[SearchQuery, Query()]):
    try:
        request = MatchRequest(**query.model_dump())
    except ValidationError:
        raise HTTPException(422, "Provide at least one recognized search feature") from None
    return match_signs(db, request)


@router.post("/signs/match", response_model=MatchResponse)
def match(query: MatchRequest, db: DB):
    return match_signs(db, query)


@router.get("/signs/{sign_id}", response_model=SignOut)
def sign_detail(sign_id: str, db: DB):
    return sign_out(db, require(db, SignDesign, sign_id))


@router.get("/signs/{sign_id}/references", response_model=Page[ReferenceData])
def references(sign_id: str, db: DB, limit: Limit = 50, offset: Offset = 0):
    require(db, SignDesign, sign_id)
    return page(
        db,
        select(ReferenceImage)
        .where(ReferenceImage.sign_id == sign_id)
        .order_by(ReferenceImage.image_id),
        ReferenceData,
        limit,
        offset,
    )


@router.get("/routes", response_model=Page[RouteData])
def routes(db: DB, limit: Limit = 50, offset: Offset = 0):
    return page(db, select(Route).order_by(Route.route_id), RouteData, limit, offset)


@router.get("/route-groups", response_model=Page[RouteGroupData])
def groups(db: DB, limit: Limit = 50, offset: Offset = 0):
    return page(
        db, select(RouteGroup).order_by(RouteGroup.color_group_id), RouteGroupData, limit, offset
    )


@router.get("/routes/{route_id}/signs", response_model=Page[SignOut])
def route_signs(route_id: str, db: DB, limit: Limit = 50, offset: Offset = 0):
    require(db, Route, route_id)
    return page(
        db,
        select(SignDesign).where(SignDesign.route_id == route_id).order_by(SignDesign.sign_id),
        SignOut,
        limit,
        offset,
    )


@router.get("/train-models", response_model=Page[TrainModelData])
def train_models(db: DB, limit: Limit = 50, offset: Offset = 0):
    return page(
        db, select(TrainModel).order_by(TrainModel.train_model_id), TrainModelData, limit, offset
    )


@router.get("/train-models/{train_model_id}/signs", response_model=Page[SignOut])
def train_signs(train_model_id: str, db: DB, limit: Limit = 50, offset: Offset = 0):
    require(db, TrainModel, train_model_id)
    return page(
        db,
        select(SignDesign)
        .where(SignDesign.equipment.any(SignEquipment.train_model_id == train_model_id))
        .order_by(SignDesign.sign_id),
        SignOut,
        limit,
        offset,
    )


@router.get("/sources", response_model=Page[SourceData])
def sources(db: DB, limit: Limit = 50, offset: Offset = 0):
    return page(db, select(Source).order_by(Source.source_id), SourceData, limit, offset)


@router.get("/specimen-sets", response_model=Page[SpecimenSetData])
def specimen_sets(db: DB, limit: Limit = 50, offset: Offset = 0):
    return page(
        db, select(SpecimenSet).order_by(SpecimenSet.display_order), SpecimenSetData, limit, offset
    )


@router.get("/specimen-entries", response_model=Page[SpecimenEntryData])
def specimen_entries(
    db: DB, limit: Limit = 50, offset: Offset = 0, set_id: str | None = None, key: str | None = None
):
    statement = select(SpecimenEntry)
    if set_id is not None:
        statement = statement.where(SpecimenEntry.set_id == set_id)
    if key is not None:
        statement = statement.where(SpecimenEntry.key == key)
    return page(
        db,
        statement.order_by(SpecimenEntry.set_id, SpecimenEntry.display_order),
        SpecimenEntryData,
        limit,
        offset,
    )


@router.get("/specimen-sets/{set_id}/signs", response_model=Page[SignOut])
def specimen_set_signs(set_id: str, db: DB, limit: Limit = 50, offset: Offset = 0):
    require(db, SpecimenSet, set_id)
    statement = select(SignDesign).where(
        SignDesign.specimen_entries.any(SpecimenEntry.set_id == set_id)
    )
    return page(db, statement.order_by(SignDesign.sign_id), SignOut, limit, offset)
