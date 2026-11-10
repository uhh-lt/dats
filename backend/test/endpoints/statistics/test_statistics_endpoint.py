from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled

# ===========================================================================
# KEYWORD STATISTICS (/statistics/keyword) TESTS
# ===========================================================================


def test_keyword_statistics_are_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.post(
        "/statistics/keyword",
        params={"project_id": featureless_project["project"].id},
        json=[featureless_project["sdoc"].id],
    )

    assert_feature_disabled(response, Feature.KEYWORD_STATISTICS)


def test_keyword_statistics_of_a_project_with_the_feature_are_computed(
    client: TestClient, project_with_sdoc
):
    """The test project enables all features; its document has no keywords."""
    response = client.post(
        "/statistics/keyword",
        params={"project_id": project_with_sdoc["project"].id},
        json=[project_with_sdoc["source_document"].id],
    )

    assert response.status_code == 200, response.text
    assert response.json() == []
