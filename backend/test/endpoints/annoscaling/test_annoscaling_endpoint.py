from fastapi.testclient import TestClient

from feature_test_utils import (
    FeaturelessProject,
    assert_feature_disabled,
    feature_named,
)
from modules.annoscaling.annoscaling_dto import (
    AnnoscalingConfirmSuggest,
    AnnoscalingResult,
    AnnoscalingSuggest,
)
from pipeline_test_utils import artefact_named
from systems.feature_system.feature_registry import feature_registry

from .conftest import AnnotatedScalingProject

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


def test_suggest_finds_the_nearest_sentences_without_semantic_search(
    client: TestClient, annotated_scaling_project: AnnotatedScalingProject
):
    """A project with annotation scaling but without semantic search: the
    sentence nearest to the annotated one is suggested with its text."""
    p = annotated_scaling_project
    text = p["project"]["text"]
    dto = AnnoscalingSuggest(
        project_id=p["project"]["project"].id,
        code_id=p["accept"].id,
        reject_cide_id=p["reject"].id,
        top_k=10,
    )

    response = client.post("/annoscaling/suggest", json=dto.model_dump())

    assert response.status_code == 200, response.text
    results = [AnnoscalingResult.model_validate(r) for r in response.json()]
    assert [(r.sdoc_id, r.sentence_id, r.text) for r in results] == [
        (text.id, 1, "The cat sits on the mat.")
    ]


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


def test_annotation_scaling_requires_the_sentence_embeddings():
    """Annotation scaling requires the sentence embeddings, the only artefact it needs
    besides the core artefacts."""
    assert feature_named("annotation_scaling").requires_artefacts == {
        artefact_named("sentence_embeddings")
    }
    assert feature_registry.required_artefacts(
        [feature_named("annotation_scaling")]
    ) == {artefact_named("sentence_embeddings")}
