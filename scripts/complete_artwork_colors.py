"""Complete missing reference colors from actual SVG declarations, never route colors."""

import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET


def svg_color(value: str) -> str | None:
    value = value.strip().lower()
    named = {"black": "#000000", "white": "#FFFFFF"}
    if value in named:
        return named[value]
    if re.fullmatch(r"#[0-9a-f]{3}", value):
        return "#" + "".join(v * 2 for v in value[1:]).upper()
    if re.fullmatch(r"#[0-9a-f]{6}", value):
        return value.upper()
    match = re.fullmatch(r"rgb\(([^)]+)\)", value)
    if match:
        channels = [v.strip() for v in match[1].split(",")]
        if len(channels) == 3:
            numbers = [
                round(float(v[:-1]) * 255 / 100) if v.endswith("%") else round(float(v))
                for v in channels
            ]
            if all(0 <= v <= 255 for v in numbers):
                return "#" + "".join(f"{v:02X}" for v in numbers)
    return None


def visible_fills(path: Path) -> list[str]:
    root = ET.fromstring(path.read_bytes())
    paints = []

    def walk(element, inherited):
        tag = element.tag.rsplit("}", 1)[-1]
        if tag in {"defs", "metadata", "style", "title", "desc", "namedview", "clipPath"}:
            return
        style = dict(inherited)
        if "fill" in element.attrib:
            style["fill"] = element.attrib["fill"]
        for declaration in element.get("style", "").split(";"):
            if ":" in declaration:
                key, value = declaration.split(":", 1)
                style[key.strip()] = value.strip()
        if style.get("display") == "none" or style.get("visibility") == "hidden":
            return
        if tag in {"path", "polygon", "polyline", "rect", "circle", "ellipse", "text", "tspan"}:
            if paint := svg_color(style.get("fill", "black")):
                paints.append(paint)
        for child in element:
            walk(child, style)

    walk(root, {})
    return paints


def main():
    path = Path("data/curated/artwork_patterns.json")
    bundle = json.loads(path.read_text())
    sources = {s["source_id"]: s for s in bundle["sources"]}
    refs = {r["sign_id"]: r for r in bundle["reference_images"]}
    index = json.loads(Path("data/raw/svg-index.json").read_text())["files"]
    for sign in bundle["signs"]:
        ref = refs[sign["sign_id"]]
        filename = sources[ref["source_id"]]["title"]
        # Existing known declarations are unchanged. This specifically handles
        # polygon glyphs, implicit default black, and percentage RGB declarations.
        if sign["background_color"] is None or sign["foreground_color"] is None:
            fills = visible_fills(Path("data/raw") / index[filename]["path"])
            if sign["background_color"] is None and fills:
                sign["background_color"] = fills[0]
            if sign["foreground_color"] is None:
                sign["foreground_color"] = next(
                    (v for v in reversed(fills) if v != sign["background_color"]), None
                )
            for key in ("background_color", "foreground_color"):
                if sign[key] and key not in sign["feature_provenance"]:
                    sign["feature_provenance"][key] = {
                        "basis": "source_svg",
                        "source_id": ref["source_id"],
                        "notes": "Exact SVG paint declaration, including default black or percentage RGB; not a physical paint specification.",
                    }
    path.write_text(json.dumps(bundle, indent=2) + "\n")


if __name__ == "__main__":
    main()
