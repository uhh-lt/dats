from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.duplicate_finder.duplicate_finder_job import DuplicateFinderInput
from modules.ml.ml_enum import MLJobType
from modules.ml.ml_job_dto import DocTagRecommendationParams, MLJobInput

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

    assert_feature_disabled(response, Feature.DUPLICATE_FINDER)


def test_tag_recommendation_ml_job_is_rejected_when_the_feature_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    payload = MLJobInput(
        project_id=featureless_project["project"].id,
        ml_job_type=MLJobType.TAG_RECOMMENDATION,
        specific_ml_job_parameters=DocTagRecommendationParams(
            ml_job_type=MLJobType.TAG_RECOMMENDATION
        ),
    )

    response = client.post("/job/ml", json=payload.model_dump(mode="json"))

    assert_feature_disabled(response, Feature.TAG_RECOMMENDATION)
