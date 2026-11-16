from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.duplicate_finder.duplicate_finder_job import DuplicateFinderInput
from modules.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationJobInput,
)

# ===========================================================================
# START JOB (/job/{job_type}) TESTS
# ===========================================================================
# Jobs of gated modules check their feature in `validate_input` before they are
# enqueued.


def test_duplicate_finder_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    payload = DuplicateFinderInput(
        project_id=featureless_project["project"].id,
        max_different_words=1,
        tag_id=None,
    )

    response = client.post("/job/duplicate_finder", json=payload.model_dump())

    assert_feature_disabled(response, "duplicate_finder")


def test_tag_recommendation_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    payload = TagRecommendationJobInput(project_id=featureless_project["project"].id)

    response = client.post(
        "/job/tag_recommendation", json=payload.model_dump(mode="json")
    )

    assert_feature_disabled(response, "tag_recommendation")


# ===========================================================================
# RETRY JOB (/job/{job_type}/{job_id}/retry) TESTS
# ===========================================================================


def test_retry_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_tag_recommendation_job: str
):
    """A retry checks the input again like the start: tag recommendation is
    disabled in the job's project, so the job is not requeued."""
    response = client.post(
        f"/job/tag_recommendation/{featureless_tag_recommendation_job}/retry"
    )

    assert_feature_disabled(response, "tag_recommendation")
