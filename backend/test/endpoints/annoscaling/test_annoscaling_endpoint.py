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
    SdocSentencePair,
)
from pipeline_test_utils import artefact_named
from systems.feature_system.feature_registry import feature_registry

from .conftest import AnnotatedScalingProject

# The codes are never read: the feature check comes first.
CODE_ID = 1
REJECT_CODE_ID = 2

# ===========================================================================
# SUGGEST (/projects/{project_id}/annotation-scaling/suggest) TESTS
# ===========================================================================


def test_suggest_is_rejected_when_annotation_scaling_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    dto = AnnoscalingSuggest(
        code_id=CODE_ID,
        reject_cide_id=REJECT_CODE_ID,
        top_k=10,
    )

    response = client.post(
        f"/projects/{featureless_project['project'].id}/annotation-scaling/suggest",
        json=dto.model_dump(),
    )

    assert_feature_disabled(response, "annotation_scaling")


def test_suggest_finds_the_nearest_sentences_without_semantic_search(
    client: TestClient, annotated_scaling_project: AnnotatedScalingProject
):
    """A project with annotation scaling but without semantic search: the
    sentence nearest to the annotated one is suggested with its text."""
    p = annotated_scaling_project
    text = p["project"]["text"]
    dto = AnnoscalingSuggest(
        code_id=p["accept"].id,
        reject_cide_id=p["reject"].id,
        top_k=10,
    )

    response = client.post(
        f"/projects/{p['project']['project'].id}/annotation-scaling/suggest",
        json=dto.model_dump(),
    )

    assert response.status_code == 200, response.text
    results = [AnnoscalingResult.model_validate(r) for r in response.json()]
    assert [(r.sdoc_id, r.sentence_id, r.text) for r in results] == [
        (text.id, 1, "The cat sits on the mat.")
    ]


# ===========================================================================
# CONFIRM SUGGESTIONS (/projects/{project_id}/annotation-scaling/confirm-suggestions) TESTS
# ===========================================================================


def test_confirm_suggestions_is_rejected_when_annotation_scaling_is_disabled(
    client: TestClient, featureless_project: FeaturelessProject
):
    dto = AnnoscalingConfirmSuggest(
        code_id=CODE_ID,
        reject_code_id=REJECT_CODE_ID,
        accept=[],
        reject=[],
    )

    response = client.post(
        f"/projects/{featureless_project['project'].id}"
        "/annotation-scaling/confirm-suggestions",
        json=dto.model_dump(),
    )

    assert_feature_disabled(response, "annotation_scaling")


def test_confirm_suggestions_with_a_code_of_another_project_is_a_conflict(
    client: TestClient, annotated_scaling_project: AnnotatedScalingProject
):
    """The code of the new annotations is a body id of a write: a code of another
    project is rejected by the composite foreign key (409)."""
    p = annotated_scaling_project
    dto = AnnoscalingConfirmSuggest(
        code_id=p["foreign_code"].id,
        reject_code_id=p["reject"].id,
        accept=[SdocSentencePair(sdoc_id=p["project"]["text"].id, sentence=1)],
        reject=[],
    )

    response = client.post(
        f"/projects/{p['project']['project'].id}"
        "/annotation-scaling/confirm-suggestions",
        json=dto.model_dump(),
    )

    assert response.status_code == 409, response.text


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
