from fastapi.testclient import TestClient

from feature_test_utils import FeaturelessProject, assert_feature_disabled
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingSuggest,
)
from modules.annoscaling.annoscaling_feature import ANNOTATION_SCALING
from modules.doc_processing.artefacts import SENTENCE_EMBEDDINGS
from systems.feature_system.feature_registry import feature_registry

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

    assert_feature_disabled(response, "annotation_scaling")


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

    assert_feature_disabled(response, "annotation_scaling")


# ===========================================================================
# FEATURE DECLARATION (annoscaling_feature.py)
# ===========================================================================


def test_annotation_scaling_builds_on_sentence_similarity_search():
    """Annotation scaling requires sentence similarity search and needs only its sentence
    embeddings besides the core artefacts."""
    assert {f.name for f in ANNOTATION_SCALING.requires_features} == {
        "sentence_similarity_search"
    }
    assert feature_registry.required_artefacts([ANNOTATION_SCALING]) == {
        SENTENCE_EMBEDDINGS
    }
