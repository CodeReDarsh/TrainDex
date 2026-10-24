import pytest


@pytest.mark.parametrize(
    "path",
    [
        "/signs",
        "/routes",
        "/route-groups",
        "/train-models",
        "/sources",
        "/routes/6/signs",
        "/train-models/TEST_RETIRED/signs",
        "/signs/TEST_6_CIRCLE/references",
    ],
)
def test_paginated_endpoints(client, path):
    response = client.get(path, params={"limit": 1, "offset": 0})
    assert response.status_code == 200, response.text
    assert response.json()["limit"] == 1
    assert len(response.json()["items"]) <= 1


def test_detail_serialization(client):
    body = client.get("/signs/TEST_6_CIRCLE").json()
    assert body["classification"]["dex_category"] == "active"
    assert body["classification"]["color_group_id"] == "TEST_GREEN"
    assert body["sources"][0]["source_id"] == "TEST_SOURCE"


@pytest.mark.parametrize(
    "path",
    ["/signs/NOPE", "/routes/NOPE/signs", "/train-models/NOPE/signs", "/signs/NOPE/references"],
)
def test_missing_records(client, path):
    assert client.get(path).status_code == 404


@pytest.mark.parametrize(
    "params", [{"limit": 0}, {"limit": 201}, {"offset": -1}, {"shape": "triangle"}]
)
def test_invalid_list_requests(client, params):
    assert client.get("/signs", params=params).status_code == 422


def test_match_and_static_search_route(client):
    body = {"route": "6", "shape": "diamond", "train_model": "UNKNOWN"}
    post = client.post("/signs/match", json=body)
    assert post.status_code == 200, post.text
    assert post.json()["matches"][0]["sign_id"] == "TEST_6_DIAMOND"
    get = client.get("/signs/search", params={"route": "6", "shape": "diamond"})
    assert get.status_code == 200, get.text
    assert get.json()["matches"][0]["sign_id"] == "TEST_6_DIAMOND"


def test_invalid_match_body(client):
    assert client.get("/signs/search").status_code == 422
    assert client.post("/signs/match", json={}).status_code == 422
    assert (
        client.post("/signs/match", json={"route": "6", "background_color": "bad"}).status_code
        == 422
    )


def test_pagination(client):
    first = client.get("/signs", params={"limit": 1, "offset": 0}).json()
    second = client.get("/signs", params={"limit": 1, "offset": 1}).json()
    assert first["total"] == second["total"] == 4
    assert first["items"][0]["sign_id"] != second["items"][0]["sign_id"]


def test_stats_and_openapi(client):
    assert client.get("/stats").json()["total_distinct_designs"] == 4
    assert "/signs/match" in client.get("/openapi.json").json()["paths"]


def test_unmigrated_health(client):
    assert client.get("/health").status_code == 503
