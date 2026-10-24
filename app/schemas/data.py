from datetime import date, datetime
from typing import Annotated, TypeVar

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from app.models.enums import (
    DexCategory,
    ImageType,
    Position,
    ServiceType,
    Shape,
    SourceType,
    Status,
    Technology,
    Verification,
)

Color = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]
Identifier = Annotated[str, Field(min_length=1, max_length=160, pattern=r"^[A-Za-z0-9_.:-]+$")]


class DataModel(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True, str_strip_whitespace=True)


class SourceData(DataModel):
    source_id: Identifier
    title: str = Field(min_length=1)
    url: HttpUrl
    publisher: str | None = None
    author: str | None = None
    source_type: SourceType
    accessed_at: datetime
    publication_date: date | None = None
    license: str | None = None
    notes: str | None = None


class RouteGroupData(DataModel):
    color_group_id: Identifier
    group_name: str
    display_name: str
    hex_color: Color | None = None
    display_order: int | None = None
    is_active: bool = True
    source_id: Identifier | None = None


class RouteData(DataModel):
    route_id: Identifier
    route_name: str
    color_group_id: Identifier | None = None
    current_service_status: Status = Status.unknown
    display_order: int | None = None
    description: str | None = None
    source_id: Identifier | None = None


class TrainModelData(DataModel):
    train_model_id: Identifier
    model_name: str
    manufacturer: str | None = None
    introduction_year: int | None = Field(default=None, ge=1800, le=2200)
    retirement_year: int | None = Field(default=None, ge=1800, le=2200)
    service_status: Status = Status.unknown
    division: str | None = None
    description: str | None = None
    source_id: Identifier | None = None


class SignData(DataModel):
    sign_id: Identifier
    identity_key: str = Field(min_length=1, max_length=250)
    route_id: Identifier | None = None
    sign_text: str = Field(min_length=1, max_length=120)
    display_name: str = Field(min_length=1)
    display_order: int | None = None
    shape: Shape = Shape.unknown
    background_color: Color | None = None
    foreground_color: Color | None = None
    font_family: str | None = None
    font_weight: str | None = None
    font_style: str | None = None
    font_variant: str | None = None
    character_proportions: dict | None = None
    border_style: str | None = None
    layout: str | None = None
    aspect_ratio: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    sign_technology: Technology = Technology.unknown
    service_type: ServiceType = ServiceType.unknown
    design_family: str | None = None
    historical_era: str | None = None
    is_historical: bool = False
    valid_from: date | None = None
    valid_to: date | None = None
    description: str | None = None
    distinguishing_features: list[str] = Field(default_factory=list)
    verification_status: Verification = Verification.unknown
    dex_category_override: DexCategory | None = None
    override_source_id: Identifier | None = None
    override_reason: str | None = None
    manual_review: bool = False

    @model_validator(mode="after")
    def evidence_and_dates(self):
        if self.dex_category_override and not (self.override_source_id and self.override_reason):
            raise ValueError("Category overrides require a source and reason")
        if self.valid_from and self.valid_to and self.valid_to < self.valid_from:
            raise ValueError("valid_to precedes valid_from")
        return self


class ReferenceData(DataModel):
    image_id: Identifier
    sign_id: Identifier
    file_path: str | None = None
    source_url: HttpUrl
    source_id: Identifier
    image_format: str | None = None
    image_type: ImageType
    view_angle: Position = Position.unknown
    photographer: str | None = None
    license: str | None = None
    attribution: str | None = None
    verification_status: Verification = Verification.unknown
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    checksum: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


class SignSourceData(DataModel):
    sign_id: Identifier
    source_id: Identifier
    claim: str = Field(min_length=1)
    verification_status: Verification = Verification.candidate


class SignEquipmentData(DataModel):
    sign_id: Identifier
    train_model_id: Identifier
    source_id: Identifier
    verification_status: Verification = Verification.candidate
    notes: str | None = None


class ObservationData(DataModel):
    observation_id: Identifier
    sign_id: Identifier
    observed_route: str | None = None
    observed_train_model: Identifier | None = None
    observed_at: datetime | None = None
    sign_position: Position = Position.unknown
    image_id: Identifier | None = None
    notes: str | None = None
    verification_status: Verification = Verification.unknown


class HistoryData(DataModel):
    history_id: Identifier
    route_id: Identifier
    color_group_id: Identifier
    valid_from: date | None = None
    valid_to: date | None = None
    source_id: Identifier
    notes: str | None = None


class ReviewData(DataModel):
    issue_id: Identifier
    sign_id: Identifier
    source_id: Identifier | None = None
    field_name: str | None = None
    description: str
    resolved: bool = False


class Bundle(DataModel):
    sources: list[SourceData] = Field(default_factory=list)
    route_groups: list[RouteGroupData] = Field(default_factory=list)
    routes: list[RouteData] = Field(default_factory=list)
    train_models: list[TrainModelData] = Field(default_factory=list)
    signs: list[SignData] = Field(default_factory=list)
    sign_sources: list[SignSourceData] = Field(default_factory=list)
    sign_equipment: list[SignEquipmentData] = Field(default_factory=list)
    reference_images: list[ReferenceData] = Field(default_factory=list)
    observations: list[ObservationData] = Field(default_factory=list)
    route_group_history: list[HistoryData] = Field(default_factory=list)
    review_issues: list[ReviewData] = Field(default_factory=list)


class Classification(DataModel):
    sign_id: str
    route_id: str | None
    color_group_id: str | None
    dex_category: DexCategory | None
    service_status: Status
    display_name: str
    display_order: int | None
    requires_manual_review: bool
    review_reasons: list[str]


class SignOut(SignData):
    created_at: datetime
    updated_at: datetime
    classification: Classification
    reference_images: list[ReferenceData]
    sources: list[SignSourceData]
    equipment: list[SignEquipmentData]
    review_issues: list[ReviewData]


T = TypeVar("T")


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int
