from enum import StrEnum


class Verification(StrEnum):
    verified = "verified"
    candidate = "candidate"
    disputed = "disputed"
    unknown = "unknown"


class Status(StrEnum):
    active = "active"
    discontinued = "discontinued"
    historical = "historical"
    unknown = "unknown"


class DexCategory(StrEnum):
    active = "active"
    not_in_service = "not_in_service"


class Shape(StrEnum):
    circle = "circle"
    diamond = "diamond"
    rectangle = "rectangle"
    square = "square"
    other = "other"
    unknown = "unknown"


class Technology(StrEnum):
    rollsign = "rollsign"
    led = "led"
    lcd = "lcd"
    hybrid = "hybrid"
    artwork = "artwork"
    other = "other"
    unknown = "unknown"


class ServiceType(StrEnum):
    local = "local"
    express = "express"
    shuttle = "shuttle"
    special = "special"
    unknown = "unknown"


class ImageType(StrEnum):
    authentic_photograph = "authentic_photograph"
    official_artwork = "official_artwork"
    reconstructed_svg = "reconstructed_svg"
    digitally_recreated = "digitally_recreated"
    other = "other"


class Position(StrEnum):
    front = "front"
    rear = "rear"
    side = "side"
    interior = "interior"
    close_up = "close_up"
    other = "other"
    unknown = "unknown"


class SourceType(StrEnum):
    historical_documentation = "historical_documentation"
    official_specification = "official_specification"
    photographic_evidence = "photographic_evidence"
    community = "community"
    unverified_observation = "unverified_observation"
