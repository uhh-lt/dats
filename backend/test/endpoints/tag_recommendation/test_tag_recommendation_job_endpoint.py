from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.tag_recommendation.tag_recommendation_dto import TagRecommendationResult
from modules.tag_recommendation.tag_recommendation_orm import (
    TagRecommendationLinkORM,
)

from .conftest import (
    FEATURELESS_ML_JOB_ID,
    OUTSIDER_ML_JOB_ID,
    OWN_ML_JOB_ID,
    TagRecommendationProject,
)


def _url(project_id: int, job_id: str) -> str:
    return f"/projects/{project_id}/jobs/tag-recommendation/{job_id}/recommendations"


# ===========================================================================
# GET RECOMMENDATIONS
# (/projects/{project_id}/jobs/tag-recommendation/{job_id}/recommendations) TESTS
# ===========================================================================


def test_get_recommendations_groups_the_recommendations_of_the_job_by_document(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """Both recommendations of the job are for one document, by descending
    score."""
    p = tag_recommendation_project

    response = client.get(_url(p["project"].id, OWN_ML_JOB_ID))

    assert response.status_code == 200, response.text
    results = [TagRecommendationResult.model_validate(r) for r in response.json()]
    assert [r.recommendation_ids for r in results] == [
        [p["recommendation_a"].id, p["recommendation_b"].id]
    ]
    assert [r.suggested_tag_ids for r in results] == [[p["tag_a"].id, p["tag_b"].id]]


def test_get_recommendations_of_a_job_of_an_outsider_project_is_not_found(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """The job of the outsider project does not exist in the test user's project."""
    response = client.get(
        _url(tag_recommendation_project["project"].id, OUTSIDER_ML_JOB_ID)
    )

    assert response.status_code == 404, response.text


def test_get_recommendations_of_a_non_member_is_forbidden(
    outsider_client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    response = outsider_client.get(
        _url(tag_recommendation_project["project"].id, OWN_ML_JOB_ID)
    )

    assert response.status_code == 403, response.text


def test_get_recommendations_is_rejected_when_the_feature_is_disabled(
    client: TestClient,
    featureless_project: FeaturelessProject,
    featureless_recommendation: TagRecommendationLinkORM,
):
    response = client.get(
        _url(featureless_project["project"].id, FEATURELESS_ML_JOB_ID)
    )

    assert_feature_disabled(response, "tag_recommendation")
