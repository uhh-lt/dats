import pytest
from fastapi.testclient import TestClient

from common.feature_enum import Feature
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
            Feature.SENTENCE_SIMILARITY_SEARCH,
            id="sentences",
        ),
        pytest.param("/simsearch/images", Feature.IMAGE_SIMILARITY_SEARCH, id="images"),
    ],
)
def test_similarity_search_is_rejected_when_its_feature_is_disabled(
    client: TestClient,
    featureless_project: FeaturelessProject,
    path: str,
    feature: Feature,
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
