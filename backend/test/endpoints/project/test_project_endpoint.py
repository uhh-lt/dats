import pytest
from fastapi.testclient import TestClient

from common.feature_enum import Feature, FeatureStatus
from common.job_type_enum import JobType
from core.project.project_dto import (
    ProjectCreate,
    ProjectFeatureRead,
    ProjectRead,
    ProjectUpdate,
)
from experiment_test_utils import RunUserProject
from feature_test_utils import FeatureProject, PartlyProject

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
    read = _get_features(client, feature_project["project"].id)[feature]

    assert read.enabled is False
    assert read.status == FeatureStatus.DISABLED
    assert read.ready is False
    assert (read.covered_documents, read.total_documents) == (0, total)
    assert read.missing_steps == missing


def test_project_features_requires_membership(client: TestClient):
    """A non-member gets 403."""
    response = client.get("/project/123456/features")

    assert response.status_code == 403, response.text


def test_project_features_count_the_documents_by_the_status_of_their_steps(
    client: TestClient, partly_project: PartlyProject
):
    """Full-text search covers one document; two failed (an erroneous index or
    text extraction), two lack a planned step and nothing runs: it is partly
    available."""
    read = _get_features(client, partly_project["project"].id)[Feature.FULL_TEXT_SEARCH]

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
    read = _get_features(client, feature_project["project"].id)[
        Feature.SENTENCE_SIMILARITY_SEARCH
    ]

    assert read.status == FeatureStatus.DISABLED
    assert (read.processing_documents, read.not_planned_documents) == (1, 1)


# ===========================================================================
# UPDATE PROJECT (/project/{project_id}) TESTS
# ===========================================================================


def test_update_project_rejects_enabled_features(client: TestClient, test_project):
    """The enabled features change through the feature endpoints only: a project
    update with `enabled_features` is rejected as an empty update."""
    response = client.patch(
        f"/project/{test_project.id}", json={"enabled_features": []}
    )

    assert response.status_code == 422, response.text


def test_update_project_changes_the_title(client: TestClient, test_project):
    """The title changes, the enabled features stay."""
    update = ProjectUpdate(title="Renamed")

    response = client.patch(
        f"/project/{test_project.id}",
        json=update.model_dump(mode="json", exclude_unset=True),
    )

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert project.title == "Renamed"
    assert project.enabled_features == list(Feature)
