import pytest
from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled

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
    """`test_project` enables both searches; a list of texts is no query, as
    the collections hold CLIP embeddings of one text or image: 400."""
    response = client.post(
        path,
        params={"project_id": test_project.id, "top_k": 10, "threshold": 0.5},
        json={"query": ["alpha", "beta"], "filter": EMPTY_FILTER},
    )

    assert response.status_code == 400, response.text
    assert "not a list" in response.text
