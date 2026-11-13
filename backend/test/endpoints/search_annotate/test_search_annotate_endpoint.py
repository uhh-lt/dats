from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled

# ===========================================================================
# AUTO ANNOTATE (/search_annotate/auto_annotate) TESTS
# ===========================================================================


def test_auto_annotate_is_rejected_when_search_annotate_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    """The Elasticsearch query is never sent."""
    response = client.post(
        "/search_annotate/auto_annotate",
        params={"project_id": featureless_project["project"].id, "query": "alpha"},
    )

    assert_feature_disabled(response, Feature.SEARCH_ANNOTATE)
