from pydantic import Field, model_validator

from app.models.enums import ServiceType, Shape, Technology
from app.schemas.data import Classification, Color, DataModel, ReferenceData, SignOut


class Weights(DataModel):
    route: float = Field(default=5, ge=0, le=100)
    shape: float = Field(default=3, ge=0, le=100)
    background_color: float = Field(default=2, ge=0, le=100)
    foreground_color: float = Field(default=1, ge=0, le=100)
    font_family: float = Field(default=2, ge=0, le=100)
    font_variant: float = Field(default=2, ge=0, le=100)
    layout: float = Field(default=2, ge=0, le=100)
    sign_technology: float = Field(default=2, ge=0, le=100)
    train_model: float = Field(default=1, ge=0, le=100)
    historical_era: float = Field(default=1, ge=0, le=100)
    service_type: float = Field(default=1, ge=0, le=100)


class SearchQuery(DataModel):
    route: str | None = Field(default=None, min_length=1, max_length=120)
    shape: Shape | None = None
    background_color: Color | None = None
    foreground_color: Color | None = None
    font_family: str | None = Field(default=None, min_length=1, max_length=120)
    font_variant: str | None = Field(default=None, min_length=1, max_length=160)
    layout: str | None = Field(default=None, min_length=1, max_length=100)
    sign_technology: Technology | None = None
    train_model: str | None = Field(default=None, min_length=1, max_length=80)
    historical_era: str | None = Field(default=None, min_length=1, max_length=120)
    service_type: ServiceType | None = None
    include_artwork: bool = True
    specimen_set: str | None = Field(default=None, min_length=1, max_length=40)
    strict_route: bool = True
    limit: int = Field(default=10, ge=1, le=100)
    min_score: float = Field(default=0, ge=0, le=1)
    color_delta_e: float | None = Field(default=None, gt=0, le=200)


class MatchRequest(SearchQuery):
    weights: Weights = Field(default_factory=Weights)
    confidence: dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="after")
    def useful_features(self):
        weights = self.weights.model_dump()
        for key, value in self.confidence.items():
            if key not in weights or not 0 <= value <= 1:
                raise ValueError("confidence must map supported feature names to values in [0, 1]")
        if not any(
            getattr(self, k) not in (None, "unknown") and weight * self.confidence.get(k, 1) > 0
            for k, weight in weights.items()
        ):
            raise ValueError(
                "Provide at least one recognized feature with positive weight and confidence"
            )
        return self


class FeatureResult(DataModel):
    feature: str
    similarity: float | None
    explanation: str


class Match(DataModel):
    sign_id: str
    similarity_score: float
    evidence_coverage: float
    matching_features: list[str]
    conflicting_features: list[str]
    uncertain_features: list[str]
    feature_results: list[FeatureResult]
    classification: Classification
    reference_images: list[ReferenceData]
    sign: SignOut


class MatchResponse(DataModel):
    matches: list[Match]
    candidates_considered: int
    candidates_available: int
    truncated: bool
    score_notice: str = "Heuristic similarity scores are not calibrated probabilities."
