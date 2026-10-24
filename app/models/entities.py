"""Portable SQLAlchemy schema; PostgreSQL is the production database."""

from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    MetaData,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

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


def utcnow():
    return datetime.now(UTC)


def enum(cls):
    return Enum(cls, native_enum=False, create_constraint=True, validate_strings=True)


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class Source(Base):
    __tablename__ = "sources"
    source_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, unique=True)
    publisher: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[SourceType] = mapped_column(enum(SourceType))
    accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    publication_date: Mapped[date | None] = mapped_column(Date)
    license: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)


class RouteGroup(Base):
    __tablename__ = "route_groups"
    color_group_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    group_name: Mapped[str] = mapped_column(String(120), unique=True)
    display_name: Mapped[str] = mapped_column(Text)
    hex_color: Mapped[str | None] = mapped_column(String(7))
    display_order: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.source_id"))
    __table_args__ = (
        CheckConstraint(
            "hex_color IS NULL OR (length(hex_color) = 7 AND substr(hex_color, 1, 1) = '#')",
            name="hex_color",
        ),
    )


class Route(Base):
    __tablename__ = "routes"
    route_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    route_name: Mapped[str] = mapped_column(Text)
    color_group_id: Mapped[str | None] = mapped_column(ForeignKey("route_groups.color_group_id"))
    current_service_status: Mapped[Status] = mapped_column(enum(Status), default=Status.unknown)
    display_order: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    group: Mapped[RouteGroup | None] = relationship(lazy="selectin")
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.source_id"))


class RouteGroupHistory(Base):
    __tablename__ = "route_group_history"
    history_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.route_id"), index=True)
    color_group_id: Mapped[str] = mapped_column(ForeignKey("route_groups.color_group_id"))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"))
    notes: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from", name="dates"
        ),
    )


class TrainModel(Base):
    __tablename__ = "train_models"
    train_model_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100), unique=True)
    manufacturer: Mapped[str | None] = mapped_column(Text)
    introduction_year: Mapped[int | None] = mapped_column(Integer)
    retirement_year: Mapped[int | None] = mapped_column(Integer)
    service_status: Mapped[Status] = mapped_column(enum(Status), default=Status.unknown)
    division: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.source_id"))
    __table_args__ = (
        CheckConstraint(
            "retirement_year IS NULL OR introduction_year IS NULL OR retirement_year >= introduction_year",
            name="years",
        ),
    )


class SignDesign(Base):
    __tablename__ = "sign_designs"
    sign_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    # Curated identity across imports; photographs never supply design identity.
    identity_key: Mapped[str] = mapped_column(String(250), unique=True)
    route_id: Mapped[str | None] = mapped_column(ForeignKey("routes.route_id"), index=True)
    sign_text: Mapped[str] = mapped_column(String(120), index=True)
    display_name: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int | None] = mapped_column(Integer)
    shape: Mapped[Shape] = mapped_column(enum(Shape), default=Shape.unknown)
    background_color: Mapped[str | None] = mapped_column(String(7))
    foreground_color: Mapped[str | None] = mapped_column(String(7))
    font_family: Mapped[str | None] = mapped_column(String(120))
    font_weight: Mapped[str | None] = mapped_column(String(80))
    font_style: Mapped[str | None] = mapped_column(Text)
    font_variant: Mapped[str | None] = mapped_column(String(160))
    feature_provenance: Mapped[dict] = mapped_column(JSON, default=dict)
    character_proportions: Mapped[dict | None] = mapped_column(JSON)
    border_style: Mapped[str | None] = mapped_column(Text)
    layout: Mapped[str | None] = mapped_column(String(100))
    aspect_ratio: Mapped[float | None] = mapped_column(Float)
    sign_technology: Mapped[Technology] = mapped_column(
        enum(Technology), default=Technology.unknown
    )
    service_type: Mapped[ServiceType] = mapped_column(
        enum(ServiceType), default=ServiceType.unknown
    )
    design_family: Mapped[str | None] = mapped_column(String(160), index=True)
    historical_era: Mapped[str | None] = mapped_column(String(120))
    is_historical: Mapped[bool] = mapped_column(Boolean, default=False)
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text)
    distinguishing_features: Mapped[list] = mapped_column(JSON, default=list)
    verification_status: Mapped[Verification] = mapped_column(
        enum(Verification), default=Verification.unknown, index=True
    )
    dex_category_override: Mapped[DexCategory | None] = mapped_column(enum(DexCategory))
    override_source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.source_id"))
    override_reason: Mapped[str | None] = mapped_column(Text)
    manual_review: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    route: Mapped[Route | None] = relationship(lazy="selectin")
    references: Mapped[list["ReferenceImage"]] = relationship(
        back_populates="sign", lazy="selectin"
    )
    evidence: Mapped[list["SignSource"]] = relationship(lazy="selectin")
    equipment: Mapped[list["SignEquipment"]] = relationship(lazy="selectin")
    reviews: Mapped[list["ReviewIssue"]] = relationship(lazy="selectin")
    specimen_entries: Mapped[list["SpecimenEntry"]] = relationship(lazy="selectin")
    __table_args__ = (
        CheckConstraint("aspect_ratio IS NULL OR aspect_ratio > 0", name="aspect_ratio"),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from", name="dates"
        ),
        CheckConstraint(
            "dex_category_override IS NULL OR (override_source_id IS NOT NULL AND override_reason IS NOT NULL)",
            name="override_evidence",
        ),
        *(
            CheckConstraint(f"{c} IS NULL OR (length({c}) = 7 AND substr({c}, 1, 1) = '#')", name=c)
            for c in ("background_color", "foreground_color")
        ),
        Index("ix_sign_designs_shape_technology", "shape", "sign_technology"),
    )


class SignSource(Base):
    __tablename__ = "sign_sources"
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"), primary_key=True)
    claim: Mapped[str] = mapped_column(Text)
    verification_status: Mapped[Verification] = mapped_column(
        enum(Verification), default=Verification.candidate
    )
    source: Mapped[Source] = relationship(lazy="selectin")


class SignEquipment(Base):
    __tablename__ = "sign_equipment"
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), primary_key=True)
    train_model_id: Mapped[str] = mapped_column(
        ForeignKey("train_models.train_model_id"), primary_key=True
    )
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"))
    verification_status: Mapped[Verification] = mapped_column(
        enum(Verification), default=Verification.candidate
    )
    notes: Mapped[str | None] = mapped_column(Text)


class ReferenceImage(Base):
    __tablename__ = "reference_images"
    image_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), index=True)
    file_path: Mapped[str | None] = mapped_column(Text, unique=True)
    source_url: Mapped[str] = mapped_column(Text)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"))
    image_format: Mapped[str | None] = mapped_column(String(20))
    image_type: Mapped[ImageType] = mapped_column(enum(ImageType))
    view_angle: Mapped[Position] = mapped_column(enum(Position), default=Position.unknown)
    photographer: Mapped[str | None] = mapped_column(Text)
    license: Mapped[str | None] = mapped_column(Text)
    attribution: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[Verification] = mapped_column(
        enum(Verification), default=Verification.unknown
    )
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    checksum: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sign: Mapped[SignDesign] = relationship(back_populates="references")
    __table_args__ = (
        UniqueConstraint("image_id", "sign_id"),
        UniqueConstraint("sign_id", "source_url"),
        CheckConstraint("width IS NULL OR width > 0", name="width"),
        CheckConstraint("height IS NULL OR height > 0", name="height"),
        CheckConstraint(
            "file_path IS NULL OR (license IS NOT NULL AND attribution IS NOT NULL AND checksum IS NOT NULL)",
            name="local_asset_provenance",
        ),
    )


class SignObservation(Base):
    __tablename__ = "sign_observations"
    observation_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), index=True)
    observed_route: Mapped[str | None] = mapped_column(String(120))
    observed_train_model: Mapped[str | None] = mapped_column(
        ForeignKey("train_models.train_model_id")
    )
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sign_position: Mapped[Position] = mapped_column(enum(Position), default=Position.unknown)
    image_id: Mapped[str | None] = mapped_column(String(160))
    notes: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[Verification] = mapped_column(
        enum(Verification), default=Verification.unknown
    )
    __table_args__ = (
        ForeignKeyConstraint(
            ["image_id", "sign_id"], ["reference_images.image_id", "reference_images.sign_id"]
        ),
    )


class ReviewIssue(Base):
    __tablename__ = "review_issues"
    issue_id: Mapped[str] = mapped_column(String(160), primary_key=True)
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), index=True)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.source_id"))
    field_name: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class SpecimenSet(Base):
    __tablename__ = "specimen_sets"
    set_id: Mapped[str] = mapped_column(String(40), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    font_file: Mapped[str] = mapped_column(String(200))
    display_order: Mapped[int] = mapped_column(Integer)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"))
    source_url: Mapped[str] = mapped_column(Text)


class SpecimenEntry(Base):
    __tablename__ = "specimen_entries"
    set_id: Mapped[str] = mapped_column(ForeignKey("specimen_sets.set_id"), primary_key=True)
    key: Mapped[str] = mapped_column(String(160), primary_key=True)
    sign_id: Mapped[str] = mapped_column(ForeignKey("sign_designs.sign_id"), index=True)
    codepoint: Mapped[str] = mapped_column(String(8))
    description: Mapped[str] = mapped_column(Text)
    service_label: Mapped[str] = mapped_column(Text)
    filename: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer)
    listing_status: Mapped[str] = mapped_column(String(20))
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.source_id"))
    __table_args__ = (
        CheckConstraint(
            "listing_status IN ('listed', 'unassigned', 'proposed', 'blank')", name="listing_status"
        ),
    )
