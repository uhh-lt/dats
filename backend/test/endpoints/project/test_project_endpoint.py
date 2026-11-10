import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient

from common.feature_enum import Feature
from common.job_type_enum import JobType
from core.project.project_dto import (
    ProjectCreate,
    ProjectFeatureRead,
    ProjectRead,
    ProjectUpdate,
)
from experiment_test_utils import RunUserProject
from feature_test_utils import FeatureProject
from systems.feature_system.feature_dto import FeatureActivationJobInput
from systems.job_system.job_dto import JobInputBase

# ===========================================================================
# CREATE PROJECT (/project) TESTS
# ===========================================================================


def test_create_new_project(client):
    payload = {
        "title": "My First Test Project",
        "description": "Testing create endpoint",
    }
    response = client.put("/project", json=payload)

    assert response.status_code == 200, response.text
    project = response.json()
    assert project["title"] == payload["title"]
    assert project["description"] == payload["description"]


# ===========================================================================
# DELETE PROJECT (/project/{project_id}) TESTS
# ===========================================================================


def test_delete_existing_project(client: TestClient, test_project):
    response = client.delete(f"/project/{test_project.id}")

    assert response.status_code == 200, response.text
    project = response.json()
    assert project["id"] == test_project.id
    assert project["title"] == test_project.title
    assert project["description"] == test_project.description


def test_delete_project_with_experiments_deletes_them_and_their_run_users(
    client: TestClient, run_user_project: RunUserProject
):
    """Deleting a project removes its experiments, runs and users in one statement:
    the run users (ON DELETE NO ACTION) do not block it."""
    p = run_user_project
    project_id = p["project"].id
    experiment_ids = [
        p["human_gold_experiment"].id,
        p["virtual_gold_experiment"].id,
    ]
    virtual_user_ids = [
        p[key].id  # type: ignore[literal-required]
        for key in (
            "group_standard",
            "human_gold_run_user",
            "virtual_gold_run_user",
            "second_run_user",
            "failed_run_user",
        )
    ]

    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 200, response.text
    assert response.json()["id"] == project_id
    for experiment_id in experiment_ids:
        # deleted objects are indistinguishable from unauthorized ones
        assert client.get(f"/experiment/{experiment_id}").status_code == 403
    for user_id in virtual_user_ids:
        assert client.get(f"/user/by_id/{user_id}").status_code == 404
    # the human gold annotator is no virtual user: only the membership is gone
    assert client.get(f"/user/by_id/{p['gold_annotator'].id}").status_code == 200


def test_delete_nonexistent_project(client: TestClient):
    project_id = 1234
    response = client.delete(f"/project/{project_id}")

    assert response.status_code == 403, response.text


# ===========================================================================
# PROJECT FEATURES: CREATE (/project) TESTS
# ===========================================================================


def test_create_project_enables_all_features_by_default(client: TestClient):
    """A project created without `enabled_features` enables every feature, so
    it behaves like every project before the feature toggles."""
    response = client.put("/project", json={"title": "All", "description": ""})

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == list(Feature)


def test_create_project_enables_the_features_the_requested_ones_require(
    client: TestClient,
):
    """Requesting RAG chat also enables sentence similarity search."""
    create = ProjectCreate(
        title="RAG", description="", enabled_features=[Feature.RAG_CHAT]
    )

    response = client.put("/project", json=create.model_dump(mode="json"))

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.enabled_features == [
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.RAG_CHAT,
    ]


# ===========================================================================
# PROJECT FEATURES (/project/{project_id}/features) TESTS
# ===========================================================================


def _get_features(
    client: TestClient, project_id: int
) -> dict[Feature, ProjectFeatureRead]:
    response = client.get(f"/project/{project_id}/features")
    assert response.status_code == 200, response.text
    reads = [ProjectFeatureRead.model_validate(r) for r in response.json()]
    return {r.feature: r for r in reads}


def test_project_features_of_a_project_without_documents_are_ready(
    client: TestClient, test_project
):
    """Every feature of `test_project` is enabled and ready: it applies to no
    document."""
    features = _get_features(client, test_project.id)

    assert list(features) == list(Feature)
    for read in features.values():
        assert read.enabled and read.ready, read
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
    read = _get_features(client, feature_project["project"].id)[feature]

    assert read.enabled is False
    assert read.ready is False
    assert (read.covered_documents, read.total_documents) == (0, total)
    assert read.missing_steps == missing


def test_project_features_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.get("/project/123456/features")

    assert response.status_code == 403, response.text


# ===========================================================================
# PROJECT FEATURES: UPDATE (/project/{project_id}) TESTS
# ===========================================================================


def _patch_features(
    client: TestClient, project_id: int, features: list[Feature]
) -> ProjectRead:
    update = ProjectUpdate(enabled_features=features)
    response = client.patch(
        f"/project/{project_id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )
    assert response.status_code == 200, response.text
    return ProjectRead.model_validate(response.json())


def _status(db_session, sdoc_id: int, step: JobType) -> int | None:
    db_session.expire_all()
    return db_session.execute(
        sa.text(f"SELECT {step.value} FROM sourcedocument WHERE id = :id"),
        {"id": sdoc_id},
    ).scalar_one()


def test_enabling_features_plans_their_steps_for_all_documents(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Enabling keyword statistics and RAG chat enables sentence similarity
    search, sets the missing text steps of both text documents to processing and
    leaves the image alone. One feature activation job starts the steps whose
    inputs are finished (text_done); text_running gets them when spaCy
    finishes."""
    p = feature_project

    project = _patch_features(
        client, p["project"].id, [Feature.KEYWORD_STATISTICS, Feature.RAG_CHAT]
    )

    assert project.enabled_features == [
        Feature.SENTENCE_SIMILARITY_SEARCH,
        Feature.RAG_CHAT,
        Feature.KEYWORD_STATISTICS,
    ]
    for sdoc in (p["text_done"], p["text_running"]):
        for step in (JobType.TEXT_KEYWORDS, JobType.TEXT_SENTENCE_EMBEDDING):
            assert _status(db_session, sdoc.id, step) == 0, (sdoc.name, step)
        assert _status(db_session, sdoc.id, JobType.TEXT_ES_INDEX) is None
    # finished steps keep their status
    assert _status(db_session, p["text_done"].id, JobType.TEXT_SPACY) == 1
    assert _status(db_session, p["image"].id, JobType.IMAGE_CAPTION) is None

    assert len(started_jobs) == 1
    job_type, payload = started_jobs[0]
    assert job_type == JobType.FEATURE_ACTIVATION
    assert isinstance(payload, FeatureActivationJobInput)
    assert payload.sdoc_steps == {
        p["text_done"].id: [JobType.TEXT_KEYWORDS, JobType.TEXT_SENTENCE_EMBEDDING]
    }


def test_enabling_image_captions_plans_the_text_steps_of_images(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """With a caption, an image has text: enabling image captions plans the
    caption and the text steps after it, but starts only the caption."""
    p = feature_project

    _patch_features(client, p["project"].id, [Feature.IMAGE_CAPTIONS])

    for step in (JobType.IMAGE_CAPTION, JobType.TEXT_EXTRACTION, JobType.TEXT_SPACY):
        assert _status(db_session, p["image"].id, step) == 0, step
    _, payload = started_jobs[0]
    assert isinstance(payload, FeatureActivationJobInput)
    assert payload.sdoc_steps == {p["image"].id: [JobType.IMAGE_CAPTION]}


def test_enabling_an_enabled_feature_again_starts_nothing(
    client: TestClient,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Steps that are planned already are neither planned nor started again."""
    project_id = feature_project["project"].id
    _patch_features(client, project_id, [Feature.FULL_TEXT_SEARCH])
    started_jobs.clear()

    _patch_features(client, project_id, [Feature.FULL_TEXT_SEARCH])

    assert started_jobs == []


def test_disabling_a_feature_keeps_its_steps(
    client: TestClient,
    db_session,
    feature_project: FeatureProject,
    started_jobs: list[tuple[JobType, JobInputBase]],
):
    """Disabling only changes the enabled features: the planned steps stay."""
    p = feature_project
    _patch_features(client, p["project"].id, [Feature.FULL_TEXT_SEARCH])
    started_jobs.clear()

    project = _patch_features(client, p["project"].id, [])

    assert project.enabled_features == []
    assert _status(db_session, p["text_done"].id, JobType.TEXT_ES_INDEX) == 0
    assert started_jobs == []


def test_disabling_a_feature_that_an_enabled_feature_requires_is_rejected(
    client: TestClient, test_project
):
    """RAG chat requires sentence similarity search: disabling only the latter
    fails with 400 and names RAG chat."""
    update = ProjectUpdate(
        enabled_features=[f for f in Feature if f != Feature.SENTENCE_SIMILARITY_SEARCH]
    )

    response = client.patch(
        f"/project/{test_project.id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )

    assert response.status_code == 400, response.text
    assert "rag_chat" in response.text
