from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled

# ===========================================================================
# TAG RECOMMENDATION JOBS (/tagrecommendation/{project_id}) TESTS
# ===========================================================================


def test_tag_recommendation_jobs_are_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    response = client.get(f"/tagrecommendation/{featureless_project['project'].id}")

    assert_feature_disabled(response, Feature.TAG_RECOMMENDATION)


def test_tag_recommendation_jobs_of_a_project_with_the_feature_are_listed(
    client: TestClient, test_project
):
    response = client.get(f"/tagrecommendation/{test_project.id}")

    assert response.status_code == 200, response.text
    assert response.json() == []
