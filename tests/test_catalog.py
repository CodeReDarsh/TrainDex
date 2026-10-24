from pathlib import Path

from scripts.build_catalog import build


def test_retained_real_catalog_is_evidence_based():
    bundle = build(Path("data/raw"), Path("data/references"))
    assert len(bundle.signs) == 15
    assert sum(s.verification_status == "verified" for s in bundle.signs) == 13
    assert len({s.identity_key for s in bundle.signs}) == 15
    assert len(bundle.sign_sources) == 15
    assert all(s.font_family is None and s.valid_from is None for s in bundle.signs)
    assert all(s.background_color is None for s in bundle.signs)
    assert all(i.license and i.attribution for i in bundle.reference_images)
    assert all(i.image_type == "authentic_photograph" for i in bundle.reference_images)


def test_real_classification_uncertainty():
    bundle = build(Path("data/raw"), Path("data/references"))
    signs = {s.sign_id: s for s in bundle.signs}
    routes = {r.route_id: r for r in bundle.routes}
    assert routes["R"].color_group_id == "yellow"
    assert signs["B_R_BROWN_DIAMOND_SIDE"].route_id == "R"
    assert signs["IRT_10_GREEN_CIRCLE_SIDE"].route_id is None
    assert signs["IRT_13_RED_CIRCLE_END"].route_id is None
    assert signs["IRT_3_RED_CIRCLE_SIDE"].layout == "side_route_and_destination"


def test_current_official_colors_are_not_photographic_colors():
    bundle = build(Path("data/raw"), Path("data/references"))
    groups = {g.color_group_id: g for g in bundle.route_groups}
    assert groups["green"].hex_color == "#009952"
    assert groups["blue"].hex_color == "#0062CF"
    assert groups["gray"].hex_color == groups["shuttle_gray"].hex_color
    assert groups["gray"].color_group_id != groups["shuttle_gray"].color_group_id
