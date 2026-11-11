import sqlalchemy as sa
from fastapi.testclient import TestClient

from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.project.project_dto import ProjectFeatureRead
from feature_test_utils import FeatureProject, PartlyProject
from modules.doc_processing.doc_processing_dto import ProcessingSettings
from systems.feature_system.feature_dto import (
    FeatureActivation,
    FeatureActivationJobInput,
    FeatureRead,
)
from systems.job_system.job_dto import JobInputBase

from .conftest import ImageTextProject

# ===========================================================================
# GET ALL FEATURES (/feature) TESTS
# ===========================================================================


def test_get_all_features_lists_every_feature_with_its_requirements(
    client: TestClient,
):
    """Every toggleable feature, in enum order, with a title and the features it
    requires (RAG chat, annotation scaling and concepts over time require
    sentence similarity search, no other feature requires one)."""
    response = client.get("/feature")

    assert response.status_code == 200, response.text
    features = [FeatureRead.model_validate(f) for f in response.json()]
    assert [f.feature for f in features] == list(Feature)
    assert all(f.title for f in features)
    requires = {f.feature: f.requires_features for f in features if f.requires_features}
    assert requires == {
        Feature.RAG_CHAT: [Feature.SENTENCE_SIMILARITY_SEARCH],
        Feature.ANNOTATION_SCALING: [Feature.SENTENCE_SIMILARITY_SEARCH],
        Feature.CONCEPTS_OVER_TIME: [Feature.SENTENCE_SIMILARITY_SEARCH],
    }


# ===========================================================================
# ACTIVATE FEATURE (/feature/project/{project_id}/{feature}) TESTS
# ===========================================================================

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=3,
    keyword_number=7,
    keyword_deduplication_threshold=0.3,
    keyword_max_ngram_size=3,
    language=Language.german,
    model="default",
)


def _activate(client: TestClient, project_id: int, feature: Feature) -> list[Feature]:
    response = client.put(
        f"/feature/project/{project_id}/{feature.value}",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return [Feature(f) for f in response.json()]


def _status(db_session, sdoc_id: int, step: JobType) -> int | None:
    db_session.expire_all()
    return db_session.execute(
        sa.text(f"SELECT {step.value} FROM sourcedocument WHERE id = :id"),
        {"id": sdoc_id},
    ).scalar_one()


def _features(client: TestClient, project_id: int) -> dict[Feature, ProjectFeatureRead]:
    response = client.get(f"/project/{project_id}/features")
    assert response.status_code == 200, response.text
    reads = [ProjectFeatureRead.model_validate(r) for r in response.json()]
    return {r.feature: r for r in reads}


def _activation_job(
    started_jobs: list[tuple[JobType, JobInputBase]],
) -> FeatureActivationJobInput:
    assert len(started_jobs) == 1, started_jobs
    job_type, payload = started_jobs[0]
    assert job_type == JobType.FEATURE_ACTIVATION
    assert isinstance(payload, FeatureActivationJobInput)
    return payload


# --- A. enable --------------------------------------------------------------


def test_activate_feature_enables_it_and_the_features_it_requires(
    client: TestClient,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Activating RAG chat enables sentence similarity search as well."""
    enabled = _activate(client, feature_project["project"].id, Feature.RAG_CHAT)

    assert enabled == [Feature.SENTENCE_SIMILARITY_SEARCH, Feature.RAG_CHAT]


def test_activate_feature_plans_its_steps_and_starts_them_with_the_settings(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Activating keyword statistics plans text_keywords for both text documents
    and leaves the image and the steps of other features alone. One feature
    activation job with the chosen settings starts the steps whose inputs are
    finished (text_done); text_running gets them when its inputs finish."""
    p = feature_project

    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    for sdoc in (p["text_done"], p["text_running"]):
        assert _status(db_session, sdoc.id, JobType.TEXT_KEYWORDS) == 0, sdoc.name
        assert _status(db_session, sdoc.id, JobType.TEXT_ES_INDEX) is None
    assert _status(db_session, p["text_done"].id, JobType.TEXT_SPACY) == 1
    assert _status(db_session, p["image"].id, JobType.IMAGE_CAPTION) is None
    payload = _activation_job(started_jobs)
    assert payload.settings == SETTINGS
    assert payload.sdoc_steps == {p["text_done"].id: [JobType.TEXT_KEYWORDS]}


def test_activate_feature_makes_it_computing(
    client: TestClient,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """After the activation, both text documents process full-text search."""
    project_id = feature_project["project"].id

    _activate(client, project_id, Feature.FULL_TEXT_SEARCH)

    read = _features(client, project_id)[Feature.FULL_TEXT_SEARCH]
    assert read.status == FeatureStatus.COMPUTING
    assert (read.processing_documents, read.total_documents) == (2, 2)


def test_activate_image_captions_plans_the_text_steps_of_images(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """With a caption, an image has text: activating image captions plans the
    caption and the text steps after it, but starts only the caption."""
    p = feature_project

    _activate(client, p["project"].id, Feature.IMAGE_CAPTIONS)

    for step in (JobType.IMAGE_CAPTION, JobType.TEXT_EXTRACTION, JobType.TEXT_SPACY):
        assert _status(db_session, p["image"].id, step) == 0, step
    payload = _activation_job(started_jobs)
    assert payload.sdoc_steps == {p["image"].id: [JobType.IMAGE_CAPTION]}


def test_activate_image_captions_plans_the_text_features_it_makes_possible(
    client: TestClient,
    db_session,
    image_text_project: ImageTextProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """With image captions an image has text: activating them plans the steps of
    the enabled text features for the image too (the index, sentence embeddings
    and keywords), not only the caption and the core text steps."""
    image_id = image_text_project["image"].id

    _activate(client, image_text_project["project"].id, Feature.IMAGE_CAPTIONS)

    for step in (
        JobType.IMAGE_CAPTION,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_ES_INDEX,
        JobType.TEXT_SENTENCE_EMBEDDING,
        JobType.TEXT_KEYWORDS,
    ):
        assert _status(db_session, image_id, step) == 0, step


def test_activate_a_fully_available_feature_starts_nothing(
    client: TestClient,
    test_project,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """`test_project` has no documents: there is nothing to compute."""
    enabled = _activate(client, test_project.id, Feature.FULL_TEXT_SEARCH)

    assert enabled == list(Feature)
    assert started_jobs == []


def test_activate_feature_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.put(
        f"/feature/project/123456/{Feature.FULL_TEXT_SEARCH.value}",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 403, response.text


def test_activate_unknown_feature_is_rejected(client: TestClient, test_project):
    """An unknown feature is a validation error."""
    response = client.put(
        f"/feature/project/{test_project.id}/no_such_feature",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 422, response.text


# --- B. complete ------------------------------------------------------------


def test_activate_enabled_feature_completes_failed_and_not_planned_documents(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Completing full-text search plans the index again where it failed or was
    not planned, and the failed text extraction before it; the index of
    extraction_failed waits for the extraction. The indexed document is left
    alone, and the other failed steps start once their input is recomputed."""
    p = partly_project

    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)

    for key in ("index_failed", "not_indexed", "extraction_failed", "spacy_failed"):
        assert _status(db_session, p[key].id, JobType.TEXT_ES_INDEX) == 0, key
    assert _status(db_session, p["extraction_failed"].id, JobType.TEXT_EXTRACTION) == 0
    assert _status(db_session, p["extraction_failed"].id, JobType.TEXT_SPACY) == -100
    assert _status(db_session, p["indexed"].id, JobType.TEXT_ES_INDEX) == 1
    payload = _activation_job(started_jobs)
    assert payload.sdoc_steps == {
        p["index_failed"].id: [JobType.TEXT_ES_INDEX],
        p["not_indexed"].id: [JobType.TEXT_ES_INDEX],
        p["extraction_failed"].id: [JobType.TEXT_EXTRACTION],
        p["spacy_failed"].id: [JobType.TEXT_ES_INDEX],
    }


def test_activate_feature_marks_a_new_step_with_an_erroneous_input_erroneous(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Completing full-text search plans the not planned HTML mapping of
    spacy_failed (a core step); its input text_spacy is erroneous and no step of
    full-text search, so the mapping is erroneous instead of processing forever."""
    sdoc_id = partly_project["spacy_failed"].id

    _activate(client, partly_project["project"].id, Feature.FULL_TEXT_SEARCH)

    assert _status(db_session, sdoc_id, JobType.TEXT_HTML_MAPPING) == -100
    assert _status(db_session, sdoc_id, JobType.TEXT_SPACY) == -100


# ===========================================================================
# DISABLE FEATURE (/feature/project/{project_id}/{feature}) TESTS
# ===========================================================================


def test_disable_feature_keeps_its_steps(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
):
    """Disabling only changes the enabled features: the steps stay."""
    p = partly_project

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.FULL_TEXT_SEARCH.value}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []
    assert _status(db_session, p["indexed"].id, JobType.TEXT_ES_INDEX) == 1
    read = _features(client, p["project"].id)[Feature.FULL_TEXT_SEARCH]
    assert read.status == FeatureStatus.DISABLED


def test_disable_partly_available_feature_keeps_its_failed_steps(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
):
    """Full-text search is partly available: disabling it keeps the failed and the
    finished index; the not indexed document stays not planned."""
    p = partly_project

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.FULL_TEXT_SEARCH.value}"
    )

    assert response.status_code == 200, response.text
    assert _status(db_session, p["index_failed"].id, JobType.TEXT_ES_INDEX) == -100
    assert _status(db_session, p["not_indexed"].id, JobType.TEXT_ES_INDEX) is None


def test_disable_computing_feature_unplans_its_processing_steps(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Keyword statistics is computing after its activation: disabling it sets the
    processing keywords of both text documents to not planned, so no document
    stays processing for it. The processing core steps of text_running stay
    processing, and the feature is disabled, not re-enabled."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.KEYWORD_STATISTICS.value}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []
    for sdoc in (p["text_done"], p["text_running"]):
        assert _status(db_session, sdoc.id, JobType.TEXT_KEYWORDS) is None, sdoc.name
    assert _status(db_session, p["text_running"].id, JobType.TEXT_SPACY) == 0
    read = _features(client, p["project"].id)[Feature.KEYWORD_STATISTICS]
    assert read.status == FeatureStatus.DISABLED


def test_disable_computing_feature_keeps_the_steps_other_features_need(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Activating RAG chat enables sentence similarity search too, and both are
    computing the sentence embeddings. Disabling RAG chat keeps them processing:
    sentence similarity search still needs them."""
    p = feature_project
    _activate(client, p["project"].id, Feature.RAG_CHAT)

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.RAG_CHAT.value}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == [Feature.SENTENCE_SIMILARITY_SEARCH]
    step = JobType.TEXT_SENTENCE_EMBEDDING
    assert _status(db_session, p["text_done"].id, step) == 0
    read = _features(client, p["project"].id)[Feature.SENTENCE_SIMILARITY_SEARCH]
    assert read.status == FeatureStatus.COMPUTING


def test_disable_feature_that_an_enabled_feature_requires_is_rejected(
    client: TestClient, test_project
):
    """RAG chat requires sentence similarity search: disabling the latter fails
    with 400 and names RAG chat."""
    response = client.delete(
        f"/feature/project/{test_project.id}/{Feature.SENTENCE_SIMILARITY_SEARCH.value}"
    )

    assert response.status_code == 400, response.text
    assert "rag_chat" in response.text


def test_disable_feature_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.delete(
        f"/feature/project/123456/{Feature.FULL_TEXT_SEARCH.value}"
    )

    assert response.status_code == 403, response.text
