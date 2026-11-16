import pytest
from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.simsearch.simsearch_dto import SimSearchImageHit, SimSearchSentenceHit
from repos.ray.dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from repos.ray.ray_repo import RayRepo

from .conftest import SimSearchProject

EMPTY_FILTER = {"id": "root", "logic_operator": "and", "items": []}

# ===========================================================================
# GATING (/simsearch/sentences, /simsearch/images) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "path,feature",
    [
        pytest.param(
            "/simsearch/sentences",
            "sentence_similarity_search",
            id="sentences",
        ),
        pytest.param("/simsearch/images", "image_similarity_search", id="images"),
    ],
)
def test_similarity_search_is_rejected_when_its_feature_is_disabled(
    client: TestClient,
    featureless_project: FeaturelessProject,
    path: str,
    feature: str,
):
    """A project without similarity search answers 403 naming the feature."""
    response = client.post(
        path,
        params={
            "project_id": featureless_project["project"].id,
            "top_k": 10,
            "threshold": 0.5,
        },
        json={"query": "alpha", "filter": EMPTY_FILTER},
    )

    assert_feature_disabled(response, feature)


# ===========================================================================
# QUERY (/simsearch/sentences, /simsearch/images) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "path",
    [
        pytest.param("/simsearch/sentences", id="sentences"),
        pytest.param("/simsearch/images", id="images"),
    ],
)
def test_similarity_search_rejects_a_list_query(
    client: TestClient, test_project, path: str
):
    """`test_project` enables both searches; a list of texts is no query (one
    text or the id of an image), so the body validation rejects it: 422 for the
    `query` of the body, not for a missing URL parameter."""
    response = client.post(
        path,
        params={"project_id": test_project.id, "top_k": 10, "threshold": 0.5},
        json={"query": ["alpha", "beta"], "filter": EMPTY_FILTER},
    )

    assert response.status_code == 422, response.text
    locations = [error["loc"] for error in response.json()["detail"]]
    assert locations, response.text
    assert all(loc[:2] == ["body", "query"] for loc in locations), locations


# --- the query embedding ----------------------------------------------------
# CLIP is an external service: the tests replace the two RayRepo calls and
# record what they were asked to embed.


@pytest.fixture
def clip_calls(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[object]]:
    """Replaces CLIP: a text embeds to [1, 0], an image to [1, 0]; records the
    texts and the number of images."""
    calls: dict[str, list[object]] = {"text": [], "image": []}

    def embed_text(self, clip_input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        calls["text"].extend(clip_input.text)
        return ClipEmbeddingOutput(embeddings=[[1.0, 0.0] for _ in clip_input.text])

    def embed_image(self, clip_input: ClipImageEmbeddingInput) -> ClipEmbeddingOutput:
        calls["image"].append(len(clip_input.base64_images))
        return ClipEmbeddingOutput(embeddings=[[1.0, 0.0]])

    monkeypatch.setattr(RayRepo, "clip_text_embedding", embed_text)
    monkeypatch.setattr(RayRepo, "clip_image_embedding", embed_image)
    return calls


def _search(client: TestClient, path: str, project_id: int, query: str | int):
    return client.post(
        path,
        params={"project_id": project_id, "top_k": 10, "threshold": 0.75},
        json={"query": query, "filter": EMPTY_FILTER},
    )


def test_sentence_search_by_text_embeds_the_text_with_clip(
    client: TestClient,
    simsearch_project: SimSearchProject,
    clip_calls: dict[str, list[object]],
):
    """A text query is embedded by CLIP text; sentence 0 ([1, 0]) is found, and
    sentence 1 ([0, 1]) lies below the threshold (its certainty is 0.5)."""
    p = simsearch_project

    response = _search(client, "/simsearch/sentences", p["project"].id, "a cat")

    assert response.status_code == 200, response.text
    hits = [SimSearchSentenceHit.model_validate(h) for h in response.json()]
    assert [(h.sdoc_id, h.sentence_id) for h in hits] == [(p["text"].id, 0)]
    assert clip_calls == {"text": ["a cat"], "image": []}


@pytest.mark.parametrize(
    "as_text",
    [
        # the id as a JSON number
        pytest.param(False, id="int"),
        # the id as a string of digits, as the frontend sends it
        pytest.param(True, id="digit-string"),
    ],
)
def test_image_search_by_an_image_id_embeds_the_image_with_clip(
    client: TestClient,
    simsearch_project: SimSearchProject,
    clip_calls: dict[str, list[object]],
    as_text: bool,
):
    """An image id is embedded by CLIP image from the document's file; the
    image itself ([1, 0]) is found."""
    p = simsearch_project
    image_id = p["image"].id

    response = _search(
        client,
        "/simsearch/images",
        p["project"].id,
        str(image_id) if as_text else image_id,
    )

    assert response.status_code == 200, response.text
    hits = [SimSearchImageHit.model_validate(h) for h in response.json()]
    assert [h.sdoc_id for h in hits] == [image_id]
    assert clip_calls == {"text": [], "image": [1]}


def test_search_by_the_id_of_a_text_document_is_rejected(
    client: TestClient,
    simsearch_project: SimSearchProject,
    clip_calls: dict[str, list[object]],
):
    """A document id names the image to search for: the id of the text
    document answers 400 and embeds nothing."""
    p = simsearch_project

    response = _search(client, "/simsearch/images", p["project"].id, p["text"].id)

    assert response.status_code == 400, response.text
    assert "not an image" in response.text
    assert clip_calls == {"text": [], "image": []}
