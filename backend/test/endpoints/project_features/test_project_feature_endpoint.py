import threading
import time

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError

from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from common.languages_enum import Language
from core.project.project_crud import crud_project
from feature_test_utils import FeatureProject, PartlyProject, assert_feature_disabled
from job_test_utils import HeldJobs, unreachable_redis
from modules.doc_processing.doc_processing_dto import (
    FeatureActivationJobInput,
    ProcessingSettings,
)
from modules.doc_processing.step_planning_service import StepPlanningService
from modules.project_features.project_feature_dto import (
    FeatureActivation,
    ProjectFeatureRead,
)
from pipeline_test_utils import read_step_status, started_steps
from repos.db.sql_repo import SQLRepo

from .conftest import ImageTextProject, UploadingProject

# ===========================================================================
# GET PROJECT FEATURES (/feature/project/{project_id}) TESTS
# ===========================================================================


def _features(client: TestClient, project_id: int) -> dict[Feature, ProjectFeatureRead]:
    response = client.get(f"/feature/project/{project_id}")
    assert response.status_code == 200, response.text
    reads = [ProjectFeatureRead.model_validate(r) for r in response.json()]
    return {r.feature: r for r in reads}


def test_project_features_of_a_project_without_documents_are_ready(
    client: TestClient, test_project
):
    """Every feature of `test_project` is enabled and ready: it applies to no
    document."""
    features = _features(client, test_project.id)

    assert list(features) == list(Feature)
    for read in features.values():
        assert read.enabled and read.ready, read
        assert read.status == FeatureStatus.FULLY_AVAILABLE, read
        assert (read.covered_documents, read.total_documents) == (0, 0)
        assert read.missing_steps == []


@pytest.mark.parametrize(
    "feature,total,missing",
    [
        # both text documents, text_running also lacks language detection
        pytest.param(
            Feature.KEYWORD_STATISTICS,
            2,
            [JobType.TEXT_LANGUAGE_DETECTION, JobType.TEXT_KEYWORDS],
            id="keywords",
        ),
        # needs tokens and sentences, which text_running is still computing
        pytest.param(
            Feature.RAG_CHAT,
            2,
            [
                JobType.TEXT_LANGUAGE_DETECTION,
                JobType.TEXT_SPACY,
                JobType.TEXT_SENTENCE_EMBEDDING,
            ],
            id="rag-chat",
        ),
        # needs only the content
        pytest.param(
            Feature.FULL_TEXT_SEARCH, 2, [JobType.TEXT_ES_INDEX], id="full-text"
        ),
        # image features apply to the image only
        pytest.param(
            Feature.OBJECT_DETECTION,
            1,
            [JobType.IMAGE_OBJECT_DETECTION],
            id="object-detection",
        ),
        pytest.param(
            Feature.IMAGE_CAPTIONS, 1, [JobType.IMAGE_CAPTION], id="image-captions"
        ),
    ],
)
def test_project_features_report_coverage_and_missing_steps(
    client: TestClient,
    feature_project: FeatureProject,
    feature: Feature,
    total: int,
    missing: list[JobType],
):
    """In a project without features, no feature is enabled or covers a
    document; the missing steps are the steps of the feature that are not
    finished for some document it applies to."""
    read = _features(client, feature_project["project"].id)[feature]

    assert read.enabled is False
    assert read.status == FeatureStatus.DISABLED
    assert read.ready is False
    assert (read.covered_documents, read.total_documents) == (0, total)
    assert read.missing_steps == missing


def test_project_features_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.get("/feature/project/123456")

    assert response.status_code == 403, response.text


def test_project_features_count_the_documents_by_the_status_of_their_steps(
    client: TestClient, partly_project: PartlyProject
):
    """Full-text search covers one document; two failed (an erroneous index or
    text extraction), two lack a planned step and nothing runs: it is partly
    available."""
    read = _features(client, partly_project["project"].id)[Feature.FULL_TEXT_SEARCH]

    assert read.status == FeatureStatus.PARTLY_AVAILABLE
    assert read.ready is False
    counts = (
        read.covered_documents,
        read.processing_documents,
        read.failed_documents,
        read.not_planned_documents,
        read.total_documents,
    )
    assert counts == (1, 0, 2, 2, 5)


def test_project_features_count_the_documents_of_a_disabled_feature(
    client: TestClient, feature_project: FeatureProject
):
    """A disabled feature is disabled whatever its documents: sentence
    similarity search counts text_running as processing (language detection) and
    text_done as not planned (no sentence embeddings)."""
    read = _features(client, feature_project["project"].id)[
        Feature.SENTENCE_SIMILARITY_SEARCH
    ]

    assert read.status == FeatureStatus.DISABLED
    assert (read.processing_documents, read.not_planned_documents) == (1, 1)


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


# --- A. enable --------------------------------------------------------------


def test_activate_feature_enables_it_and_the_features_it_requires(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Activating RAG chat enables sentence similarity search as well."""
    enabled = _activate(client, feature_project["project"].id, Feature.RAG_CHAT)

    assert enabled == [Feature.SENTENCE_SIMILARITY_SEARCH, Feature.RAG_CHAT]


def test_activate_feature_plans_its_steps_and_starts_them_with_the_settings(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Activating keyword statistics starts one feature activation job with the
    chosen settings, which plans text_keywords for both text documents and
    leaves the image and the steps of other features alone; it starts the steps
    whose inputs are finished (text_done), text_running gets them when its
    inputs finish."""
    p = feature_project

    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    (activation,) = held_jobs.inputs(JobType.FEATURE_ACTIVATION)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    started = started_steps(held_jobs)

    for sdoc in (p["text_done"], p["text_running"]):
        assert read_step_status(db_session, sdoc.id, JobType.TEXT_KEYWORDS) == 0, (
            sdoc.name
        )
        assert read_step_status(db_session, sdoc.id, JobType.TEXT_ES_INDEX) is None
    assert read_step_status(db_session, p["text_done"].id, JobType.TEXT_SPACY) == 1
    assert read_step_status(db_session, p["image"].id, JobType.IMAGE_CAPTION) is None
    assert isinstance(activation, FeatureActivationJobInput)
    assert activation.settings == SETTINGS
    assert started == {p["text_done"].id: [JobType.TEXT_KEYWORDS]}


def test_activate_feature_makes_it_computing(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """After the activation, both text documents process full-text search."""
    project_id = feature_project["project"].id

    _activate(client, project_id, Feature.FULL_TEXT_SEARCH)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    read = _features(client, project_id)[Feature.FULL_TEXT_SEARCH]
    assert read.status == FeatureStatus.COMPUTING
    assert (read.processing_documents, read.total_documents) == (2, 2)


def test_activate_feature_is_computing_before_its_documents_are_planned(
    client: TestClient,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """No document of partly_project processes. Right after the request the
    activation job has planned nothing yet, but RAG chat and sentence similarity
    search, which it requires, are computing already."""
    project_id = partly_project["project"].id

    _activate(client, project_id, Feature.RAG_CHAT)

    features = _features(client, project_id)
    for feature in (Feature.RAG_CHAT, Feature.SENTENCE_SIMILARITY_SEARCH):
        assert features[feature].status == FeatureStatus.COMPUTING, feature
        assert features[feature].processing_documents == 0, feature


def test_activate_feature_twice_starts_one_activation(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Activating a feature whose activation is still pending is rejected with
    409, which names the feature and tells to restart it: the pending activation
    plans all documents, and a second one would drop the new settings."""
    project_id = feature_project["project"].id
    _activate(client, project_id, Feature.FULL_TEXT_SEARCH)

    response = client.put(
        f"/feature/project/{project_id}/{Feature.FULL_TEXT_SEARCH.value}",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 409, response.text
    assert f"The feature '{Feature.FULL_TEXT_SEARCH.value}' is being computed" in (
        response.text
    )
    assert "Restart it" in response.text
    assert len(held_jobs.inputs(JobType.FEATURE_ACTIVATION)) == 1


def test_activate_feature_that_requires_a_computing_feature_starts_its_activation(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Activating RAG chat while sentence similarity search, which it requires,
    has a pending activation still starts the activation of RAG chat."""
    project_id = feature_project["project"].id
    _activate(client, project_id, Feature.SENTENCE_SIMILARITY_SEARCH)

    enabled = _activate(client, project_id, Feature.RAG_CHAT)

    assert enabled == [Feature.SENTENCE_SIMILARITY_SEARCH, Feature.RAG_CHAT]
    activations = held_jobs.inputs(JobType.FEATURE_ACTIVATION)
    assert [
        a.feature for a in activations if isinstance(a, FeatureActivationJobInput)
    ] == [
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.RAG_CHAT,
    ]


def test_activate_two_features_sharing_a_step_starts_it_once(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Full-text search and search & auto-annotate both need the index: of their
    two activations, only the first plans and starts it."""
    p = feature_project

    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)
    _activate(client, p["project"].id, Feature.SEARCH_ANNOTATE)

    assert len(held_jobs.inputs(JobType.FEATURE_ACTIVATION)) == 2
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    assert started_steps(held_jobs) == {
        p["text_done"].id: [JobType.TEXT_ES_INDEX],
        p["text_running"].id: [JobType.TEXT_ES_INDEX],
    }


def test_activate_image_captions_plans_the_text_steps_of_images(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """With a caption, an image has text: activating image captions plans the
    caption and the text steps after it, but starts only the caption."""
    p = feature_project

    _activate(client, p["project"].id, Feature.IMAGE_CAPTIONS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    started = started_steps(held_jobs)

    for step in (JobType.IMAGE_CAPTION, JobType.TEXT_EXTRACTION, JobType.TEXT_SPACY):
        assert read_step_status(db_session, p["image"].id, step) == 0, step
    assert started == {p["image"].id: [JobType.IMAGE_CAPTION]}


def test_activate_image_captions_plans_the_text_features_it_makes_possible(
    client: TestClient,
    db_session,
    image_text_project: ImageTextProject,
    held_jobs: HeldJobs,
):
    """With image captions an image has text: activating them plans the steps of
    the enabled text features for the image too (the index, sentence embeddings
    and keywords), not only the caption and the core text steps."""
    image_id = image_text_project["image"].id

    _activate(client, image_text_project["project"].id, Feature.IMAGE_CAPTIONS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    for step in (
        JobType.IMAGE_CAPTION,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_ES_INDEX,
        JobType.TEXT_SENTENCE_EMBEDDING,
        JobType.TEXT_KEYWORDS,
    ):
        assert read_step_status(db_session, image_id, step) == 0, step


def test_activate_feature_job_waits_for_the_request_to_commit(
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """The request starts the activation job before it commits; the job's first
    batch waits for the request's lock on the project and then plans with the
    committed state. The request (the planning operation the endpoint delegates
    to) runs in a thread, as RQ's worker needs the main thread for its signal
    handlers; it holds its transaction open for a second after the enqueue, and
    the job starts meanwhile. The started steps prove the wait: a job that read
    before the commit would find the feature disabled and start nothing."""
    enqueued = threading.Event()
    errors: list[Exception] = []

    def _request() -> None:
        try:
            with SQLRepo().transaction() as db:
                StepPlanningService().enable_feature(
                    db=db,
                    project_id=feature_project["project"].id,
                    feature=Feature.FULL_TEXT_SEARCH,
                    settings=SETTINGS,
                )
                enqueued.set()
                time.sleep(1)
        except Exception as e:
            errors.append(e)
        finally:
            enqueued.set()

    request = threading.Thread(target=_request)
    request.start()
    enqueued.wait()
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    request.join()

    assert errors == []
    assert started_steps(held_jobs) == {
        feature_project["text_done"].id: [JobType.TEXT_ES_INDEX],
        feature_project["text_running"].id: [JobType.TEXT_ES_INDEX],
    }


def test_activate_feature_with_redis_down_changes_nothing(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """If the activation job cannot be enqueued, the request fails and rolls
    back: the feature stays disabled and nothing is planned or pending."""
    project_id = feature_project["project"].id

    with unreachable_redis(), pytest.raises(RedisConnectionError):
        _activate(client, project_id, Feature.FULL_TEXT_SEARCH)

    read = _features(client, project_id)[Feature.FULL_TEXT_SEARCH]
    assert read.status == FeatureStatus.DISABLED
    assert read.processing_documents == 0
    assert held_jobs.jobs() == []


def test_activate_feature_rolled_back_after_the_enqueue_leaves_a_job_that_stops(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """A request that rolls back after it enqueued its activation job leaves no
    pending activation: the job stops without planning or starting anything.
    Calls the planning operation the endpoint delegates to, to roll back."""
    project_id = feature_project["project"].id
    StepPlanningService().enable_feature(
        db=db_session,
        project_id=project_id,
        feature=Feature.FULL_TEXT_SEARCH,
        settings=SETTINGS,
    )
    db_session.rollback()

    held_jobs.run(JobType.FEATURE_ACTIVATION)

    assert held_jobs.jobs() == []
    project = crud_project.read(db=db_session, id=project_id)
    assert project.enabled_features == []
    assert project.feature_activations == {}
    assert (
        read_step_status(
            db_session, feature_project["text_done"].id, JobType.TEXT_ES_INDEX
        )
        is None
    )


def test_activate_feature_waits_for_a_concurrent_activation(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Two members enable a feature at the same time: the second activation waits
    until the first commits and keeps its feature, so both are enabled. Calls the
    planning operation the endpoint delegates to, to hold the first transaction open."""
    project_id = feature_project["project"].id
    service = StepPlanningService()
    service.enable_feature(
        db=db_session,
        project_id=project_id,
        feature=Feature.KEYWORD_STATISTICS,
        settings=SETTINGS,
    )

    def _other_member() -> None:
        with SQLRepo().transaction() as db:
            service.enable_feature(
                db=db,
                project_id=project_id,
                feature=Feature.WORD_FREQUENCY,
                settings=SETTINGS,
            )

    other = threading.Thread(target=_other_member)
    other.start()
    other.join(timeout=1)
    assert other.is_alive(), "the second activation did not wait for the first"
    db_session.commit()
    other.join(timeout=30)

    db_session.expire_all()
    assert crud_project.read(db=db_session, id=project_id).enabled_features == [
        Feature.WORD_FREQUENCY,
        Feature.KEYWORD_STATISTICS,
    ]


def test_activate_a_fully_available_feature_starts_nothing(
    client: TestClient,
    test_project,
    held_jobs: HeldJobs,
):
    """`test_project` has no documents: there is nothing to compute."""
    enabled = _activate(client, test_project.id, Feature.FULL_TEXT_SEARCH)

    assert enabled == list(Feature)
    assert held_jobs.jobs() == []


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
    held_jobs: HeldJobs,
):
    """Completing full-text search plans the index again where it failed or was
    not planned, and the failed text extraction before it; the index of
    extraction_failed waits for the extraction. The indexed document is left
    alone, and the other failed steps start once their input is recomputed."""
    p = partly_project

    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    started = started_steps(held_jobs)

    for key in ("index_failed", "not_indexed", "extraction_failed", "spacy_failed"):
        assert read_step_status(db_session, p[key].id, JobType.TEXT_ES_INDEX) == 0, key
    assert (
        read_step_status(db_session, p["extraction_failed"].id, JobType.TEXT_EXTRACTION)
        == 0
    )
    assert (
        read_step_status(db_session, p["extraction_failed"].id, JobType.TEXT_SPACY)
        == -100
    )
    assert read_step_status(db_session, p["indexed"].id, JobType.TEXT_ES_INDEX) == 1
    assert started == {
        p["index_failed"].id: [JobType.TEXT_ES_INDEX],
        p["not_indexed"].id: [JobType.TEXT_ES_INDEX],
        p["extraction_failed"].id: [JobType.TEXT_EXTRACTION],
        p["spacy_failed"].id: [JobType.TEXT_ES_INDEX],
    }


def test_activate_feature_marks_a_new_step_with_an_erroneous_input_erroneous(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """Completing full-text search plans the not planned HTML mapping of
    spacy_failed (a core step); its input text_spacy is erroneous and no step of
    full-text search, so the mapping is erroneous instead of processing forever."""
    sdoc_id = partly_project["spacy_failed"].id

    _activate(client, partly_project["project"].id, Feature.FULL_TEXT_SEARCH)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    assert read_step_status(db_session, sdoc_id, JobType.TEXT_HTML_MAPPING) == -100
    assert read_step_status(db_session, sdoc_id, JobType.TEXT_SPACY) == -100


# ===========================================================================
# RESTART FEATURE (/feature/project/{project_id}/{feature}/restart) TESTS
# ===========================================================================


def _restart(client: TestClient, project_id: int, feature: Feature):
    return client.post(
        f"/feature/project/{project_id}/{feature.value}/restart",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )


def test_restart_feature_starts_its_processing_steps_again(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Keyword statistics is computing after its activation, but its jobs never
    ran (they are held). Restarting it starts the keywords of text_done again;
    the language detection of text_running, a core step that was processing
    before the activation, is not started again, and the keywords of
    text_running wait for it and stay processing."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    held_jobs.empty()

    response = _restart(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    assert response.status_code == 200, response.text
    assert response.json() == [Feature.KEYWORD_STATISTICS]
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    assert started_steps(held_jobs) == {
        p["text_done"].id: [JobType.TEXT_KEYWORDS],
    }
    assert (
        read_step_status(db_session, p["text_running"].id, JobType.TEXT_KEYWORDS) == 0
    )


def test_restart_feature_replaces_its_pending_activation(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Restarting keyword statistics while its activation is still pending
    replaces it: the first activation stops before it plans anything, the
    restart plans and starts the keywords of text_done, and no activation is
    pending afterwards."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    response = _restart(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    assert response.status_code == 200, response.text
    assert len(held_jobs.inputs(JobType.FEATURE_ACTIVATION)) == 2
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    assert started_steps(held_jobs) == {p["text_done"].id: [JobType.TEXT_KEYWORDS]}
    project = crud_project.read(db=db_session, id=p["project"].id)
    assert project.feature_activations == {}
    read = _features(client, p["project"].id)[Feature.KEYWORD_STATISTICS]
    assert read.status == FeatureStatus.COMPUTING


def test_restart_feature_leaves_the_core_steps_of_an_upload_running(
    client: TestClient,
    db_session,
    uploading_project: UploadingProject,
    held_jobs: HeldJobs,
):
    """Restarting keyword statistics while uploading.txt runs its extract_html
    starts nothing: extract_html is a core step and keeps its job (a second run
    would extract the document's images twice), and the keywords wait for it."""
    p = uploading_project

    response = _restart(client, p["project"].id, Feature.KEYWORD_STATISTICS)

    assert response.status_code == 200, response.text
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    assert started_steps(held_jobs) == {}
    sdoc_id = p["uploading"].id
    assert read_step_status(db_session, sdoc_id, JobType.EXTRACT_HTML) == 0
    assert read_step_status(db_session, sdoc_id, JobType.TEXT_KEYWORDS) == 0


def test_restart_feature_leaves_the_steps_of_other_features_alone(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Restarting full-text search starts only its own processing steps (the
    index), not the keywords another activation left processing."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    held_jobs.empty()

    response = _restart(client, p["project"].id, Feature.FULL_TEXT_SEARCH)

    assert response.status_code == 200, response.text
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    assert started_steps(held_jobs) == {
        p["text_done"].id: [JobType.TEXT_ES_INDEX],
        p["text_running"].id: [JobType.TEXT_ES_INDEX],
    }


def test_restart_a_disabled_feature_is_rejected(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Only an enabled feature can be restarted: a disabled one gets 403."""
    response = _restart(client, feature_project["project"].id, Feature.FULL_TEXT_SEARCH)

    assert_feature_disabled(response, Feature.FULL_TEXT_SEARCH)
    assert held_jobs.jobs() == []


def test_restart_feature_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = _restart(client, 123456, Feature.FULL_TEXT_SEARCH)

    assert response.status_code == 403, response.text
    assert "not enabled" not in response.text


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
    assert read_step_status(db_session, p["indexed"].id, JobType.TEXT_ES_INDEX) == 1
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
    assert (
        read_step_status(db_session, p["index_failed"].id, JobType.TEXT_ES_INDEX)
        == -100
    )
    assert (
        read_step_status(db_session, p["not_indexed"].id, JobType.TEXT_ES_INDEX) is None
    )


def test_disable_computing_feature_unplans_its_processing_steps(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Keyword statistics is computing after its activation: disabling it sets the
    processing keywords of both text documents to not planned, so no document
    stays processing for it. The processing core steps of text_running stay
    processing, and the feature is disabled, not re-enabled."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.KEYWORD_STATISTICS.value}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == []
    for sdoc in (p["text_done"], p["text_running"]):
        assert read_step_status(db_session, sdoc.id, JobType.TEXT_KEYWORDS) is None, (
            sdoc.name
        )
    assert read_step_status(db_session, p["text_running"].id, JobType.TEXT_SPACY) == 0
    read = _features(client, p["project"].id)[Feature.KEYWORD_STATISTICS]
    assert read.status == FeatureStatus.DISABLED


def test_disable_computing_feature_keeps_the_steps_other_features_need(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Activating RAG chat enables sentence similarity search too, and both are
    computing the sentence embeddings. Disabling RAG chat keeps them processing:
    sentence similarity search still needs them."""
    p = feature_project
    _activate(client, p["project"].id, Feature.RAG_CHAT)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.RAG_CHAT.value}"
    )

    assert response.status_code == 200, response.text
    assert response.json() == [Feature.SENTENCE_SIMILARITY_SEARCH]
    step = JobType.TEXT_SENTENCE_EMBEDDING
    assert read_step_status(db_session, p["text_done"].id, step) == 0
    read = _features(client, p["project"].id)[Feature.SENTENCE_SIMILARITY_SEARCH]
    assert read.status == FeatureStatus.COMPUTING


def test_disable_one_of_two_features_sharing_a_step_keeps_it_processing(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Full-text search and search & auto-annotate both need the index, without
    requiring each other. Disabling search & auto-annotate keeps the index
    processing for full-text search; disabling full-text search as well
    unplans it."""
    p = feature_project
    _activate(client, p["project"].id, Feature.FULL_TEXT_SEARCH)
    _activate(client, p["project"].id, Feature.SEARCH_ANNOTATE)
    held_jobs.run(JobType.FEATURE_ACTIVATION)

    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.SEARCH_ANNOTATE.value}"
    )

    assert response.status_code == 200, response.text
    assert read_step_status(db_session, p["text_done"].id, JobType.TEXT_ES_INDEX) == 0
    response = client.delete(
        f"/feature/project/{p['project'].id}/{Feature.FULL_TEXT_SEARCH.value}"
    )
    assert response.status_code == 200, response.text
    assert (
        read_step_status(db_session, p["text_done"].id, JobType.TEXT_ES_INDEX) is None
    )


def test_enable_disable_enable_plans_the_steps_again(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Disabling a computing feature unplans its processing steps; enabling it
    again plans and starts them again."""
    p = feature_project
    _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    client.delete(
        f"/feature/project/{p['project'].id}/{Feature.KEYWORD_STATISTICS.value}"
    )
    held_jobs.empty()

    enabled = _activate(client, p["project"].id, Feature.KEYWORD_STATISTICS)
    held_jobs.run(JobType.FEATURE_ACTIVATION)
    started = started_steps(held_jobs)

    assert enabled == [Feature.KEYWORD_STATISTICS]
    assert read_step_status(db_session, p["text_done"].id, JobType.TEXT_KEYWORDS) == 0
    assert started == {p["text_done"].id: [JobType.TEXT_KEYWORDS]}


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
