from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

import dats_test_utils
from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkRead,
    TagRecommendationResult,
)

from .conftest import (
    FOREIGN_ML_JOB_ID,
    OWN_ML_JOB_ID,
    TagRecommendationProject,
)


@pytest.fixture(scope="function")
def outsider_client(
    app_client: TestClient, tag_recommendation_project: TagRecommendationProject
) -> Generator[TestClient, None, None]:
    """A client that sends its requests as the outsider."""
    c = dats_test_utils.create_user_client(
        app_client, tag_recommendation_project["outsider"]
    )
    yield c
    c.close()


def _unreviewed_recommendation_ids(client: TestClient, ml_job_id: str) -> set[int]:
    response = client.get(f"/tagrecommendation/job/{ml_job_id}")
    assert response.status_code == 200, response.text
    results = [TagRecommendationResult.model_validate(r) for r in response.json()]
    return {rid for result in results for rid in result.recommendation_ids}


# ===========================================================================
# REVIEW RECOMMENDATIONS (/tagrecommendation/review_recommendations) TESTS
# ===========================================================================


def test_review_recommendations_marks_own_recommendations_as_reviewed(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """A project member reviews both recommendations of their project."""
    p = tag_recommendation_project
    ids = [p["recommendation_a"].id, p["recommendation_b"].id]

    response = client.patch("/tagrecommendation/review_recommendations", json=ids)

    assert response.status_code == 200, response.text
    results = [TagRecommendationLinkRead.model_validate(r) for r in response.json()]
    assert [r.predicted_tag_id for r in results] == [p["tag_a"].id, p["tag_b"].id]
    assert all(r.is_reviewed for r in results)
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == set()


def test_review_recommendations_rejects_non_member_and_changes_nothing(
    client: TestClient,
    outsider_client: TestClient,
    tag_recommendation_project: TagRecommendationProject,
):
    """A user who is not a member of the project cannot review its
    recommendations, and the recommendations stay unreviewed."""
    p = tag_recommendation_project
    ids = [p["recommendation_a"].id, p["recommendation_b"].id]

    response = outsider_client.patch(
        "/tagrecommendation/review_recommendations", json=ids
    )

    assert response.status_code == 403, response.text
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == set(ids)


def test_review_recommendations_rejects_mixed_own_and_foreign_ids(
    client: TestClient,
    outsider_client: TestClient,
    tag_recommendation_project: TagRecommendationProject,
):
    """A member cannot smuggle a recommendation of a foreign project into a
    review of their own ones; the whole request is rejected and nothing changes."""
    p = tag_recommendation_project
    own_ids = [p["recommendation_a"].id]
    foreign_id = p["foreign_recommendation"].id

    response = client.patch(
        "/tagrecommendation/review_recommendations", json=[*own_ids, foreign_id]
    )

    assert response.status_code == 403, response.text
    assert _unreviewed_recommendation_ids(client, OWN_ML_JOB_ID) == {
        p["recommendation_a"].id,
        p["recommendation_b"].id,
    }
    assert _unreviewed_recommendation_ids(outsider_client, FOREIGN_ML_JOB_ID) == {
        foreign_id
    }


def test_review_recommendations_rejects_unknown_id(
    client: TestClient, tag_recommendation_project: TagRecommendationProject
):
    """An id that does not exist is rejected like a foreign one, so the
    endpoint does not reveal which ids exist."""
    response = client.patch("/tagrecommendation/review_recommendations", json=[999_999])

    assert response.status_code == 403, response.text
