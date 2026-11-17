import threading
import time

import pytest
from fastapi.testclient import TestClient

from common.job_type_enum import JobType
from common.languages_enum import Language
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from feature_test_utils import FeatureProject, PartlyProject, feature_named
from job_test_utils import HeldJobs, unreachable_redis
from pipeline_test_utils import read_step_status, started_steps
from repos.db.sql_repo import SQLRepo
from systems.artefact_system import artefact_service
from systems.artefact_system.artefact_dto import (
    ArtefactComputationJobInput,
    ProcessingSettings,
)
from systems.feature_system.feature_dto import (
    FeatureActivation,
    FeatureRead,
    ProjectFeatureRead,
)
from systems.feature_system.feature_registry import Feature, feature_registry
from systems.feature_system.feature_service import FeatureService
from systems.feature_system.feature_system_enum import (
    FeatureAction,
    FeatureArea,
    FeatureStatus,
)
from systems.job_system.job_system_enum import JobStatus

from .conftest import DuplicateFinderProject

# ===========================================================================
# GET ALL FEATURES (/feature) TESTS
# ===========================================================================


def _all_features(client: TestClient) -> dict[str, FeatureRead]:
    """The response of `GET /feature`, in its order, by feature name."""
    response = client.get("/feature")
    assert response.status_code == 200, response.text
    reads = [FeatureRead.model_validate(f) for f in response.json()]
    return {r.feature: r for r in reads}


def test_get_all_features_lists_every_feature_ordered_by_area_and_title(
    client: TestClient,
):
    """Every registered feature, ordered by the position of its area in
    `FeatureArea`, then by title."""
    features = _all_features(client)

    assert list(features) == feature_registry.names()
    areas = list(FeatureArea)
    keys = [(areas.index(f.area), f.title) for f in features.values()]
    assert keys == sorted(keys)


def test_get_all_features_reports_title_and_default(
    client: TestClient,
):
    """RAG chat reads its title, description and area from its declaration and
    is enabled in a new project."""
    rag = _all_features(client)["rag_chat"]

    assert rag.title == "RAG Chat"
    assert rag.area == FeatureArea.ANALYSIS
    assert rag.description
    assert rag.default_enabled is True


def test_get_all_features_reports_a_feature_off_by_default(
    client: TestClient, off_by_default: Feature
):
    """A feature registered with `default_enabled=False` is listed with the
    flag false."""
    read = _all_features(client)[off_by_default.name]

    assert read.default_enabled is False
    assert read.title == off_by_default.title


# ===========================================================================
# GET PROJECT FEATURES (/feature/project/{project_id}) TESTS
# ===========================================================================


def _features(client: TestClient, project_id: int) -> dict[str, ProjectFeatureRead]:
    response = client.get(f"/feature/project/{project_id}")
    assert response.status_code == 200, response.text
    reads = [ProjectFeatureRead.model_validate(r) for r in response.json()]
    return {r.feature: r for r in reads}


def test_project_features_of_a_project_without_documents_are_ready(
    client: TestClient, test_project
):
    """`test_project` is created without a feature list: every feature on by
    default is enabled and ready (it applies to no document), the others are
    disabled."""
    features = _features(client, test_project.id)

    assert list(features) == feature_registry.names()
    defaults = {f.name for f in feature_registry.defaults()}
    assert {name for name, read in features.items() if read.enabled} == defaults
    for name, read in features.items():
        assert (read.covered_documents, read.total_documents) == (0, 0), read
        if name in defaults:
            assert read.ready, read
            assert read.status == FeatureStatus.FULLY_AVAILABLE, read
        else:
            assert read.status == FeatureStatus.DISABLED, read


@pytest.mark.parametrize(
    "feature,total",
    [
        # text features apply to every document (the image has a caption)
        pytest.param("keyword_statistics", 3, id="keywords"),
        pytest.param("rag_chat", 3, id="rag-chat"),
        pytest.param("semantic_search", 3, id="semantic-search"),
        # image features apply to the image only
        pytest.param("object_detection", 1, id="object-detection"),
    ],
)
def test_project_features_report_coverage(
    client: TestClient,
    feature_project: FeatureProject,
    feature: str,
    total: int,
):
    """In a project without features, no feature is enabled or covers a
    document; it counts the documents it applies to."""
    read = _features(client, feature_project["project"].id)[feature]

    assert read.enabled is False
    assert read.status == FeatureStatus.DISABLED
    assert read.ready is False
    assert (read.covered_documents, read.total_documents) == (0, total)


def test_project_features_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.get("/feature/project/123456")

    assert response.status_code == 403, response.text


def test_project_features_ignore_a_stored_name_of_an_unregistered_feature(
    client: TestClient, db_session, removed_feature_project: ProjectORM
):
    """The stored name "removed_feature" belongs to no registered feature: the
    features of the project read without it, and the next change of the
    enabled features drops it."""
    project_id = removed_feature_project.id

    features = _features(client, project_id)

    assert "removed_feature" not in features
    assert features["keyword_statistics"].enabled is True
    _activate(client, project_id, "word_frequency")
    db_session.expire_all()
    assert crud_project.read(db=db_session, id=project_id).enabled_features == [
        "keyword_statistics",
        "word_frequency",
    ]


def test_project_features_count_the_documents_by_the_status_of_their_steps(
    client: TestClient, partly_project: PartlyProject
):
    """Keyword statistics covers one document; two failed (erroneous keywords or
    text extraction), two lack a planned step and nothing runs: it is partly
    available."""
    read = _features(client, partly_project["project"].id)["keyword_statistics"]

    assert read.status == FeatureStatus.PARTLY_AVAILABLE
    assert read.ready is False
    counts = (
        read.covered_documents,
        read.processing_documents,
        read.failed_documents,
        read.not_planned_documents,
        read.lacking_documents,
        read.total_documents,
    )
    assert counts == (1, 0, 2, 2, 4, 5)


def test_project_features_count_the_documents_of_a_disabled_feature(
    client: TestClient, feature_project: FeatureProject
):
    """A disabled feature is disabled whatever its documents: semantic
    search counts text_running as processing (text_spacy),
    text_done and the image as not planned (no sentence or image embeddings)."""
    read = _features(client, feature_project["project"].id)["semantic_search"]

    assert read.status == FeatureStatus.DISABLED
    assert (read.processing_documents, read.not_planned_documents) == (1, 2)


# ===========================================================================
# FEATURE ACTIONS: ALLOWED STATUSES TESTS
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


def _act(client: TestClient, project_id: int, feature: str, action: FeatureAction):
    """Send the action (`/enable`, `/complete` or `/disable`) for the feature."""
    url = f"/feature/project/{project_id}/{feature}/{action.value}"
    if action == FeatureAction.DISABLE:
        return client.post(url)
    return client.post(
        url, json=FeatureActivation(settings=SETTINGS).model_dump(mode="json")
    )


def _activate(client: TestClient, project_id: int, feature: str) -> list[str]:
    response = _act(client, project_id, feature, FeatureAction.ENABLE)
    assert response.status_code == 200, response.text
    return response.json()


def _complete(client: TestClient, project_id: int, feature: str) -> None:
    response = _act(client, project_id, feature, FeatureAction.COMPLETE)
    assert response.status_code == 200, response.text


# one project per status of keyword statistics
_STATUS_PROJECTS = {
    FeatureStatus.DISABLED: ("feature_project", "keyword_statistics"),
    FeatureStatus.COMPUTING: ("uploading_project", "keyword_statistics"),
    FeatureStatus.PARTLY_AVAILABLE: ("partly_project", "keyword_statistics"),
    FeatureStatus.FULLY_AVAILABLE: ("test_project", "keyword_statistics"),
}


@pytest.mark.parametrize(
    "status,action,allowed",
    [
        # Disabled: only Enable
        pytest.param(FeatureStatus.DISABLED, FeatureAction.ENABLE, True, id="disabled-enable"),
        pytest.param(FeatureStatus.DISABLED, FeatureAction.COMPLETE, False, id="disabled-complete"),
        pytest.param(FeatureStatus.DISABLED, FeatureAction.DISABLE, False, id="disabled-disable"),
        # Computing: nothing
        pytest.param(FeatureStatus.COMPUTING, FeatureAction.ENABLE, False, id="computing-enable"),
        pytest.param(FeatureStatus.COMPUTING, FeatureAction.COMPLETE, False, id="computing-complete"),
        pytest.param(FeatureStatus.COMPUTING, FeatureAction.DISABLE, False, id="computing-disable"),
        # Partly available: Complete and Disable
        pytest.param(FeatureStatus.PARTLY_AVAILABLE, FeatureAction.ENABLE, False, id="partly-enable"),
        pytest.param(FeatureStatus.PARTLY_AVAILABLE, FeatureAction.COMPLETE, True, id="partly-complete"),
        pytest.param(FeatureStatus.PARTLY_AVAILABLE, FeatureAction.DISABLE, True, id="partly-disable"),
        # Fully available: only Disable
        pytest.param(FeatureStatus.FULLY_AVAILABLE, FeatureAction.ENABLE, False, id="fully-enable"),
        pytest.param(FeatureStatus.FULLY_AVAILABLE, FeatureAction.COMPLETE, False, id="fully-complete"),
        pytest.param(FeatureStatus.FULLY_AVAILABLE, FeatureAction.DISABLE, True, id="fully-disable"),
    ],
)  # fmt: skip
def test_feature_action_is_allowed_only_in_its_statuses(
    request: pytest.FixtureRequest,
    client: TestClient,
    held_jobs: HeldJobs,
    status: FeatureStatus,
    action: FeatureAction,
    allowed: bool,
):
    """Each action in each status, on a project whose feature has that status:
    an allowed action answers 200, any other 409 naming the action, the feature
    and its status, and changes nothing."""
    fixture, feature = _STATUS_PROJECTS[status]
    project = request.getfixturevalue(fixture)
    project_id = project.id if fixture == "test_project" else project["project"].id
    assert _features(client, project_id)[feature].status == status

    response = _act(client, project_id, feature, action)

    if allowed:
        assert response.status_code == 200, response.text
        return
    assert response.status_code == 409, response.text
    assert (
        f"Cannot {action.value} the feature '{feature}': it is '{status.value}'"
        in response.text
    )
    assert _features(client, project_id)[feature].status == status
    assert held_jobs.jobs() == []


def test_feature_actions_are_rejected_while_its_computation_is_pending(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Right after Enable, keyword statistics is computing before its computation
    job planned anything: a second Enable, Complete and Disable answer 409, and
    no second computation starts."""
    project_id = feature_project["project"].id
    _activate(client, project_id, "keyword_statistics")

    for action in FeatureAction:
        response = _act(client, project_id, "keyword_statistics", action)
        assert response.status_code == 409, (action, response.text)
        assert "it is 'computing'" in response.text, action
    assert len(held_jobs.inputs(JobType.ARTEFACT_COMPUTATION)) == 1


def test_feature_actions_require_membership(client: TestClient):
    """A non-member gets 403 for every action."""
    for action in FeatureAction:
        response = _act(client, 123456, "keyword_statistics", action)
        assert response.status_code == 403, (action, response.text)


def test_feature_action_on_an_unknown_feature_is_rejected(
    client: TestClient, test_project
):
    """A feature name the backend does not know answers 404 for every action."""
    for action in FeatureAction:
        response = _act(client, test_project.id, "no_such_feature", action)

        assert response.status_code == 404, (action, response.text)
        assert "no_such_feature" in response.text, action


# ===========================================================================
# ENABLE FEATURE (/feature/project/{project_id}/{feature}/enable) TESTS
# ===========================================================================


def test_enable_feature_enables_only_it(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Enabling RAG chat enables no other feature, not even one that needs the
    same sentence embeddings."""
    enabled = _activate(client, feature_project["project"].id, "rag_chat")

    assert enabled == ["rag_chat"]


def test_enable_feature_plans_its_steps_and_starts_them_with_the_settings(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Enabling keyword statistics starts one artefact computation job with the
    chosen settings, which plans text_keywords for every document (the image
    has a caption) and starts it, as its input language detection is finished
    everywhere; it leaves the steps of other features alone."""
    p = feature_project

    _activate(client, p["project"].id, "keyword_statistics")
    (computation,) = held_jobs.inputs(JobType.ARTEFACT_COMPUTATION)
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    started = started_steps(held_jobs)

    for sdoc in (p["text_done"], p["text_running"], p["image"]):
        assert read_step_status(db_session, sdoc.id, "text_keywords") == 0, sdoc.name
        assert read_step_status(db_session, sdoc.id, "text_word_frequency") is None
    assert read_step_status(db_session, p["text_done"].id, "text_spacy") == 1
    assert read_step_status(db_session, p["image"].id, "image_object_detection") is None
    assert isinstance(computation, ArtefactComputationJobInput)
    assert computation.settings == SETTINGS
    assert started == {
        p["text_done"].id: ["text_keywords"],
        p["text_running"].id: ["text_keywords"],
        p["image"].id: ["text_keywords"],
    }


def test_enable_feature_plans_but_does_not_start_a_step_whose_input_is_processing(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Enabling semantic search plans text_sentence_embedding for every document
    and image_embedding for the image. The sentence embeddings need text_spacy:
    they start for text_done and the image, whose spaCy step finished; for
    text_running, whose spaCy step is still processing, they are planned but not
    started."""
    p = feature_project

    _activate(client, p["project"].id, "semantic_search")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    started = started_steps(held_jobs)

    assert (
        read_step_status(db_session, p["text_running"].id, "text_sentence_embedding")
        == 0
    )
    assert started == {
        p["text_done"].id: ["text_sentence_embedding"],
        p["image"].id: ["image_embedding", "text_sentence_embedding"],
    }


def test_enable_feature_makes_it_computing(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """After the computation, every document processes keyword statistics."""
    project_id = feature_project["project"].id

    _activate(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.COMPUTING
    assert (read.processing_documents, read.total_documents) == (3, 3)


def test_enable_feature_is_computing_before_its_documents_are_planned(
    client: TestClient,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """No document of partly_project processes. Right after the request the
    computation job has planned nothing yet, but RAG chat is computing
    already."""
    project_id = partly_project["project"].id

    _activate(client, project_id, "rag_chat")

    read = _features(client, project_id)["rag_chat"]
    assert read.status == FeatureStatus.COMPUTING
    assert read.processing_documents == 0


def test_a_feature_that_shares_an_artefact_of_a_pending_computation_is_computing(
    client: TestClient,
    duplicate_finder_project: DuplicateFinderProject,
    held_jobs: HeldJobs,
):
    """Enabling word frequency analysis starts a computation of the word
    frequencies, which the enabled duplicate finder needs too: right after the
    request, before any document is planned, both are computing."""
    project_id = duplicate_finder_project["project"].id
    before = _features(client, project_id)["duplicate_finder"]
    assert before.status == FeatureStatus.PARTLY_AVAILABLE

    _activate(client, project_id, "word_frequency")

    features = _features(client, project_id)
    for feature in ("word_frequency", "duplicate_finder"):
        assert features[feature].status == FeatureStatus.COMPUTING, feature
        assert features[feature].processing_documents == 0, feature


def test_enable_feature_sharing_an_artefact_of_a_computing_feature_starts_its_computation(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Enabling RAG chat while semantic search has a pending
    computation still starts a computation for RAG chat, of the sentence
    embeddings both need."""
    project_id = feature_project["project"].id
    _activate(client, project_id, "semantic_search")

    enabled = _activate(client, project_id, "rag_chat")

    assert enabled == ["rag_chat", "semantic_search"]
    computations = held_jobs.inputs(JobType.ARTEFACT_COMPUTATION)
    assert [
        a.artefacts for a in computations if isinstance(a, ArtefactComputationJobInput)
    ] == [["image_embeddings", "sentence_embeddings"], ["sentence_embeddings"]]


def test_enable_two_features_sharing_a_step_starts_it_once(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Word frequency analysis and the duplicate finder both need the word
    frequencies: of their two computations, only the first plans and starts
    them."""
    p = feature_project

    _activate(client, p["project"].id, "word_frequency")
    _activate(client, p["project"].id, "duplicate_finder")

    assert len(held_jobs.inputs(JobType.ARTEFACT_COMPUTATION)) == 2
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert started_steps(held_jobs) == {
        p["text_done"].id: ["text_word_frequency"],
        p["text_running"].id: ["text_word_frequency"],
        p["image"].id: ["text_word_frequency"],
    }


def test_enable_text_feature_plans_its_steps_for_images(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """The text steps of an image are always planned, as every image gets a
    caption: enabling keyword statistics plans and starts the keywords of the
    image too."""
    p = feature_project

    _activate(client, p["project"].id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    assert read_step_status(db_session, p["image"].id, "text_keywords") == 0
    assert started_steps(held_jobs)[p["image"].id] == ["text_keywords"]


def test_enable_feature_job_waits_for_the_request_to_commit(
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """The request starts the computation job before it commits; the job's first
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
                FeatureService().enable_feature(
                    db=db,
                    project_id=feature_project["project"].id,
                    feature=feature_named("keyword_statistics"),
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
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    request.join()

    assert errors == []
    assert started_steps(held_jobs) == {
        feature_project["text_done"].id: ["text_keywords"],
        feature_project["text_running"].id: ["text_keywords"],
        feature_project["image"].id: ["text_keywords"],
    }


def test_enable_feature_with_redis_down_changes_nothing(
    client: TestClient,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """If the computation job cannot be enqueued, the request fails with 503 and
    rolls back: the feature stays disabled and nothing is planned or pending."""
    project_id = feature_project["project"].id

    with unreachable_redis():
        response = _act(client, project_id, "keyword_statistics", FeatureAction.ENABLE)

    assert response.status_code == 503, response.text
    assert "The job queue cannot be reached" in response.text

    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.DISABLED
    assert read.processing_documents == 0
    assert held_jobs.jobs() == []


def test_enable_feature_with_redis_down_in_a_batch_fails_the_steps_it_cannot_start(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """With batches of one document, the queue is reachable for the start of
    the keywords of text_done (the first batch) only: the keywords of
    text_running and of the image cannot start and become erroneous, and the
    computation still ends. Once the keywords of text_done finished, keyword
    statistics reads partly available, and Complete starts the two others
    again."""
    monkeypatch.setattr(artefact_service, "COMPUTATION_BATCH_SIZE", 1)
    p = feature_project
    project_id = p["project"].id
    _activate(client, project_id, "keyword_statistics")

    with unreachable_redis(after_starts=1):
        held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    (computation,) = held_jobs.ran(JobType.ARTEFACT_COMPUTATION)
    assert computation.get_status() == JobStatus.FINISHED
    assert "2 step jobs could not start" in computation.job.meta["status_message"]
    assert started_steps(held_jobs) == {p["text_done"].id: ["text_keywords"]}
    for sdoc in (p["text_running"], p["image"]):
        assert read_step_status(db_session, sdoc.id, "text_keywords") == -100

    held_jobs.run("text_keywords")
    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.PARTLY_AVAILABLE

    _complete(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert started_steps(held_jobs) == {
        p["text_running"].id: ["text_keywords"],
        p["image"].id: ["text_keywords"],
    }


def test_enable_feature_whose_computation_dies_with_its_worker_stops_computing(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """The worker running the computation of keyword statistics dies before the
    first batch: RQ's cleanup of the started jobs runs the failure callback,
    which removes the pending computation. Nothing was planned, so keyword
    statistics reads partly available, and Complete starts the keywords."""
    p = feature_project
    project_id = p["project"].id
    _activate(client, project_id, "keyword_statistics")

    held_jobs.abandon(JobType.ARTEFACT_COMPUTATION)

    db_session.expire_all()
    assert crud_project.read(db=db_session, id=project_id).artefact_computations == {}
    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.PARTLY_AVAILABLE

    _complete(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert started_steps(held_jobs) == {
        p["text_done"].id: ["text_keywords"],
        p["text_running"].id: ["text_keywords"],
        p["image"].id: ["text_keywords"],
    }


def test_enable_feature_rolled_back_after_the_enqueue_leaves_a_job_that_stops(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """A request that rolls back after it enqueued its computation job leaves no
    pending computation: the job stops without planning or starting anything.
    Calls the planning operation the endpoint delegates to, to roll back."""
    project_id = feature_project["project"].id
    FeatureService().enable_feature(
        db=db_session,
        project_id=project_id,
        feature=feature_named("keyword_statistics"),
        settings=SETTINGS,
    )
    db_session.rollback()

    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    assert held_jobs.jobs() == []
    project = crud_project.read(db=db_session, id=project_id)
    assert project.enabled_features == []
    assert project.artefact_computations == {}
    assert (
        read_step_status(db_session, feature_project["text_done"].id, "text_keywords")
        is None
    )


def test_enable_feature_waits_for_a_concurrent_computation(
    db_session,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Two members enable a feature at the same time: the second computation waits
    until the first commits and keeps its feature, so both are enabled. Calls the
    planning operation the endpoint delegates to, to hold the first transaction open."""
    project_id = feature_project["project"].id
    service = FeatureService()
    service.enable_feature(
        db=db_session,
        project_id=project_id,
        feature=feature_named("keyword_statistics"),
        settings=SETTINGS,
    )

    def _other_member() -> None:
        with SQLRepo().transaction() as db:
            service.enable_feature(
                db=db,
                project_id=project_id,
                feature=feature_named("word_frequency"),
                settings=SETTINGS,
            )

    other = threading.Thread(target=_other_member)
    other.start()
    other.join(timeout=1)
    assert other.is_alive(), "the second computation did not wait for the first"
    db_session.commit()
    other.join(timeout=30)

    db_session.expire_all()
    assert crud_project.read(db=db_session, id=project_id).enabled_features == [
        "keyword_statistics",
        "word_frequency",
    ]


def test_enable_feature_in_a_project_without_documents_starts_nothing(
    client: TestClient,
    test_project,
    held_jobs: HeldJobs,
):
    """`test_project` has no documents: after disabling keyword statistics,
    enabling it again has nothing to compute and starts no computation."""
    _act(client, test_project.id, "keyword_statistics", FeatureAction.DISABLE)

    enabled = _activate(client, test_project.id, "keyword_statistics")

    assert enabled == sorted(f.name for f in feature_registry.defaults())
    assert held_jobs.jobs() == []
    read = _features(client, test_project.id)["keyword_statistics"]
    assert read.status == FeatureStatus.FULLY_AVAILABLE


# ===========================================================================
# COMPLETE FEATURE (/feature/project/{project_id}/{feature}/complete) TESTS
# ===========================================================================


def test_complete_feature_plans_failed_and_not_planned_documents(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """Completing keyword statistics plans the keywords again where they failed or
    were not planned, and the failed text extraction and language detection
    before them; the keywords of extraction_failed wait for the extraction. The
    document with keywords is left alone, and the other failed steps start once
    their input is recomputed."""
    p = partly_project

    _complete(client, p["project"].id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    started = started_steps(held_jobs)

    for key in (
        "keywords_failed",
        "without_keywords",
        "extraction_failed",
        "spacy_failed",
    ):
        assert read_step_status(db_session, p[key].id, "text_keywords") == 0, key
    assert (
        read_step_status(db_session, p["extraction_failed"].id, "text_extraction") == 0
    )
    assert read_step_status(db_session, p["extraction_failed"].id, "text_spacy") == -100
    assert read_step_status(db_session, p["with_keywords"].id, "text_keywords") == 1
    assert started == {
        p["keywords_failed"].id: ["text_keywords"],
        p["without_keywords"].id: ["text_keywords"],
        p["extraction_failed"].id: ["text_extraction"],
        p["spacy_failed"].id: ["text_keywords"],
    }


def test_complete_feature_marks_a_new_step_with_an_erroneous_input_erroneous(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """Completing keyword statistics plans the not planned HTML mapping of
    spacy_failed (a core step); its input text_spacy is erroneous and no step of
    keyword statistics, so the mapping is erroneous instead of processing forever."""
    sdoc_id = partly_project["spacy_failed"].id

    _complete(client, partly_project["project"].id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    assert read_step_status(db_session, sdoc_id, "text_html_mapping") == -100
    assert read_step_status(db_session, sdoc_id, "text_spacy") == -100


def test_complete_feature_with_redis_down_fails_the_steps_it_cannot_start(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """Completing keyword statistics while the queue cannot be reached for the
    step jobs starts nothing: every step it planned again or newly is
    erroneous, the feature reads partly available, and a Complete once the
    queue is back starts the same steps as without the outage."""
    p = partly_project
    project_id = p["project"].id
    _complete(client, project_id, "keyword_statistics")

    with unreachable_redis():
        held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    assert held_jobs.jobs() == []
    for key in (
        "keywords_failed",
        "without_keywords",
        "extraction_failed",
        "spacy_failed",
    ):
        assert read_step_status(db_session, p[key].id, "text_keywords") == -100, key
    assert (
        read_step_status(db_session, p["extraction_failed"].id, "text_extraction")
        == -100
    )
    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.PARTLY_AVAILABLE

    _complete(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert started_steps(held_jobs) == {
        p["keywords_failed"].id: ["text_keywords"],
        p["without_keywords"].id: ["text_keywords"],
        p["extraction_failed"].id: ["text_extraction"],
        p["spacy_failed"].id: ["text_keywords"],
    }


def test_complete_feature_recovers_the_steps_an_advancing_with_redis_down_failed(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
    held_jobs: HeldJobs,
):
    """Completing keyword statistics starts the text extraction of
    extraction_failed; it finishes while the queue cannot be reached, so its
    language detection, which it would start next, becomes erroneous, and the
    keywords after it as well. Once the other keywords finished, keyword
    statistics reads partly available, and Complete starts the language
    detection of extraction_failed."""
    p = partly_project
    project_id = p["project"].id
    sdoc_id = p["extraction_failed"].id
    _complete(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)

    with unreachable_redis():
        held_jobs.run("text_extraction")

    assert read_step_status(db_session, sdoc_id, "text_extraction") == 1
    assert read_step_status(db_session, sdoc_id, "text_language_detection") == -100
    assert read_step_status(db_session, sdoc_id, "text_keywords") == -100
    held_jobs.run("text_keywords")
    read = _features(client, project_id)["keyword_statistics"]
    assert read.status == FeatureStatus.PARTLY_AVAILABLE

    _complete(client, project_id, "keyword_statistics")
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert started_steps(held_jobs) == {sdoc_id: ["text_language_detection"]}


# ===========================================================================
# DISABLE FEATURE (/feature/project/{project_id}/{feature}/disable) TESTS
# ===========================================================================


def test_disable_feature_keeps_its_steps(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
):
    """Disabling only changes the enabled features: the steps stay."""
    p = partly_project

    response = _act(
        client, p["project"].id, "keyword_statistics", FeatureAction.DISABLE
    )

    assert response.status_code == 200, response.text
    assert response.json() == []
    assert read_step_status(db_session, p["with_keywords"].id, "text_keywords") == 1
    read = _features(client, p["project"].id)["keyword_statistics"]
    assert read.status == FeatureStatus.DISABLED


def test_disable_partly_available_feature_keeps_its_failed_steps(
    client: TestClient,
    db_session,
    partly_project: PartlyProject,
):
    """Keyword statistics is partly available: disabling it keeps the failed and the
    finished keywords; the document without keywords stays not planned."""
    p = partly_project

    response = _act(
        client, p["project"].id, "keyword_statistics", FeatureAction.DISABLE
    )

    assert response.status_code == 200, response.text
    assert (
        read_step_status(db_session, p["keywords_failed"].id, "text_keywords") == -100
    )
    assert (
        read_step_status(db_session, p["without_keywords"].id, "text_keywords") is None
    )


def test_disable_feature_keeps_a_feature_sharing_its_artefact(
    client: TestClient, test_project
):
    """Semantic search and RAG chat both need the sentence
    embeddings: disabling the former leaves RAG chat enabled."""
    response = _act(
        client,
        test_project.id,
        "semantic_search",
        FeatureAction.DISABLE,
    )

    assert response.status_code == 200, response.text
    enabled = response.json()
    assert "rag_chat" in enabled
    assert "semantic_search" not in enabled
