from fastapi.testclient import TestClient

from common.feature_enum import Feature
from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingSuggest,
)

# The codes are never read: the feature check comes first.
CODE_ID = 1
REJECT_CODE_ID = 2

# ===========================================================================
# SUGGEST (/annoscaling/suggest) TESTS
# ===========================================================================


def test_suggest_is_rejected_when_annotation_scaling_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    dto = AnnoscalingSuggest(
        project_id=featureless_project["project"].id,
        code_id=CODE_ID,
        reject_cide_id=REJECT_CODE_ID,
        top_k=10,
    )

    response = client.post("/annoscaling/suggest", json=dto.model_dump())

    assert_feature_disabled(response, Feature.ANNOTATION_SCALING)


# ===========================================================================
# CONFIRM SUGGESTIONS (/annoscaling/confirm_suggestions) TESTS
# ===========================================================================


def test_confirm_suggestions_is_rejected_when_annotation_scaling_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    dto = AnnoscalingConfirmSuggest(
        project_id=featureless_project["project"].id,
        code_id=CODE_ID,
        reject_code_id=REJECT_CODE_ID,
        accept=[],
        reject=[],
    )

    response = client.post("/annoscaling/confirm_suggestions", json=dto.model_dump())

    assert_feature_disabled(response, Feature.ANNOTATION_SCALING)
