"""The coreference resolution step (`modules/coreference_resolution`): enabling
its feature runs it for the documents of a project, and it replaces its mention
spans and groups on every run. The coreference model is an external service:
the tests replace `RayRepo.coref_prediction` with fixed clusters."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.languages_enum import Language
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.annotation.span_group_dto import SpanGroupWithAnnotationsRead
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.project.project_dto import ProjectCreate, ProjectRead
from core.project.project_orm import ProjectORM
from core.user.user_crud import SYSTEM_USER_ID
from job_test_utils import HeldJobs
from pipeline_test_utils import read_step_status
from repos.ray.dto.coref import CorefJobInput, CorefJobOutput, CorefOutputDoc
from repos.ray.ray_repo import RayRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivation

from .conftest import CorefProject

FEATURE = "coreference_resolution"
STEP = "coreference_resolution"

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=1,
    language=Language.auto,
    model="default",
)

# token spans (first and last token, inclusive) of `GERMAN_SENTENCES`:
# "Anna" and "Sie", "ein Buch." and "es"
CLUSTERS = [[(0, 0), (4, 4)], [(2, 3), (6, 6)]]
# a later result: "Anna" and "Sie" only
RECOMPUTED_CLUSTERS = [[(0, 0), (4, 4)]]


def _mock_coref(
    monkeypatch: pytest.MonkeyPatch, clusters: list[list[tuple[int, int]]]
) -> list[CorefJobInput]:
    """Let the model return `clusters` for every document; returns the list of
    the inputs it is called with."""
    calls: list[CorefJobInput] = []

    def _predict(self: RayRepo, input: CorefJobInput) -> CorefJobOutput:
        calls.append(input)
        return CorefJobOutput(
            id=input.id,
            project_id=input.project_id,
            documents=[
                CorefOutputDoc(id=doc.id, clusters=clusters) for doc in input.documents
            ],
        )

    monkeypatch.setattr(RayRepo, "coref_prediction", _predict)
    return calls


def _groups(
    client: TestClient, project_id: int, sdoc_id: int
) -> list[SpanGroupWithAnnotationsRead]:
    """The span groups of the system user in the document, with their spans."""
    response = client.get(
        f"/projects/{project_id}/span-groups",
        params={"user_id": SYSTEM_USER_ID, "sdoc_id": sdoc_id},
    )
    assert response.status_code == 200, response.text
    return [SpanGroupWithAnnotationsRead.model_validate(g) for g in response.json()]


def _spans(
    client: TestClient, project_id: int, sdoc_id: int
) -> list[SpanAnnotationRead]:
    """The span annotations of the system user in the document."""
    response = client.get(
        f"/projects/{project_id}/span-annotations",
        params={"user_id": SYSTEM_USER_ID, "sdoc_id": sdoc_id},
    )
    assert response.status_code == 200, response.text
    return [SpanAnnotationRead.model_validate(s) for s in response.json()]


def _texts(groups: list[SpanGroupWithAnnotationsRead]) -> list[list[str]]:
    return sorted(
        sorted(span.text for span in group.span_annotations) for group in groups
    )


# ===========================================================================
# ENABLE (/projects/{project_id}/features/coreference_resolution/enable) TESTS
# ===========================================================================


def _enable(client: TestClient, project_id: int) -> None:
    response = client.post(
        f"/projects/{project_id}/features/{FEATURE}/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text


def test_enable_resolves_the_german_text_into_mention_groups(
    client: TestClient,
    db_session: Session,
    coref_project: CorefProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """Enable runs the step for german_text with one model call for it alone,
    and stores one group "coref" per cluster with a MENTION span per mention."""
    p = coref_project
    calls = _mock_coref(monkeypatch, CLUSTERS)

    _enable(client, p["project"].id)
    held_jobs.run("artefact_computation", STEP)

    sdoc_id = p["german_text"].id
    assert read_step_status(db_session, sdoc_id, STEP) == 1
    assert [[doc.id for doc in call.documents] for call in calls] == [[sdoc_id]]
    assert calls[0].language == "de"
    assert calls[0].documents[0].tokens == [
        ["Anna", "liest", "ein", "Buch."],
        ["Sie", "mag", "es", "sehr."],
    ]
    groups = _groups(client, p["project"].id, sdoc_id)
    assert {group.name for group in groups} == {"coref"}
    assert _texts(groups) == [["Anna", "Sie"], ["ein Buch.", "es"]]
    spans = [span for group in groups for span in group.span_annotations]
    assert {span.code_id for span in spans} == {p["mention"].id}
    anna = next(span for span in spans if span.text == "Anna")
    assert (anna.begin, anna.end, anna.begin_token, anna.end_token) == (0, 4, 0, 1)


def test_enable_reuses_the_mention_code_of_the_project(
    client: TestClient,
    db_session: Session,
    coref_project: CorefProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """The project has MENTION before Enable: Enable creates no second one, and
    the spans use the existing code."""
    p = coref_project
    _mock_coref(monkeypatch, CLUSTERS)

    _enable(client, p["project"].id)
    held_jobs.run("artefact_computation", STEP)

    db_session.expire_all()
    mentions = [
        code
        for code in crud_code.read_system_codes_by_project(
            db=db_session, project_id=p["project"].id
        )
        if code.name == "MENTION"
    ]
    assert [code.id for code in mentions] == [p["mention"].id]


def test_enable_creates_the_mention_code_and_disable_keeps_it(
    client: TestClient, db_session: Session, codeless_project: ProjectORM
):
    """A project without coreference resolution has no MENTION; Enable creates
    it as a system code; Disable keeps it, as annotations may use it."""

    def mention() -> CodeORM | None:
        db_session.expire_all()
        return crud_code.read_by_name_and_project(
            db=db_session, code_name="MENTION", project_id=codeless_project.id
        )

    assert mention() is None

    _enable(client, codeless_project.id)
    created = mention()
    assert created is not None and created.is_system

    response = client.post(
        f"/projects/{codeless_project.id}/features/{FEATURE}/disable"
    )
    assert response.status_code == 200, response.text
    kept = mention()
    assert kept is not None and kept.id == created.id


@pytest.mark.parametrize(
    "sdoc_key",
    [
        # a text in English: the model supports German only
        pytest.param("english_text", id="not-german"),
        # a German caption: the step resolves text documents only
        pytest.param("german_image", id="not-text"),
    ],
)
def test_enable_finishes_documents_it_does_not_resolve_without_output(
    client: TestClient,
    db_session: Session,
    coref_project: CorefProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
    sdoc_key: str,
):
    """The step finishes for a document that is not a German text without
    calling the model and without spans or groups."""
    p = coref_project
    calls = _mock_coref(monkeypatch, CLUSTERS)

    _enable(client, p["project"].id)
    held_jobs.run("artefact_computation", STEP)

    sdoc_id = p[sdoc_key].id
    assert read_step_status(db_session, sdoc_id, STEP) == 1
    assert sdoc_id not in {doc.id for call in calls for doc in call.documents}
    assert _groups(client, p["project"].id, sdoc_id) == []


# ===========================================================================
# RECOMPUTE (/projects/{project_id}/doc-processing/recompute) TESTS
# ===========================================================================


def _recompute(client: TestClient, project_id: int, sdoc_id: int) -> None:
    response = client.post(
        f"/projects/{project_id}/doc-processing/recompute",
        params={"processing_step": STEP},
        json={"sdoc_ids": [sdoc_id], "settings": SETTINGS.model_dump(mode="json")},
    )
    assert response.status_code == 200, response.text


def test_recompute_replaces_the_mentions_and_groups(
    client: TestClient,
    coref_project: CorefProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """A second run of the step leaves exactly the spans and groups of its own
    result: the cluster the model no longer finds is gone."""
    p = coref_project
    sdoc_id = p["german_text"].id
    _mock_coref(monkeypatch, CLUSTERS)
    _enable(client, p["project"].id)
    held_jobs.run("artefact_computation", STEP)

    _mock_coref(monkeypatch, RECOMPUTED_CLUSTERS)
    _recompute(client, p["project"].id, sdoc_id)
    held_jobs.run(STEP)

    assert _texts(_groups(client, p["project"].id, sdoc_id)) == [["Anna", "Sie"]]
    assert sorted(span.text for span in _spans(client, p["project"].id, sdoc_id)) == [
        "Anna",
        "Sie",
    ]


def test_recompute_clears_a_document_that_is_no_longer_german(
    client: TestClient,
    db_session: Session,
    coref_project: CorefProject,
    held_jobs: HeldJobs,
    monkeypatch: pytest.MonkeyPatch,
):
    """formerly_german holds the mentions of an earlier run but is English now:
    the recompute calls no model and leaves no MENTION span and no group of the
    system user."""
    p = coref_project
    sdoc_id = p["formerly_german"].id
    calls = _mock_coref(monkeypatch, CLUSTERS)
    assert _texts(_groups(client, p["project"].id, sdoc_id)) == [["Anna", "She"]]

    _recompute(client, p["project"].id, sdoc_id)
    held_jobs.run(STEP)

    assert calls == []
    assert read_step_status(db_session, sdoc_id, STEP) == 1
    assert _groups(client, p["project"].id, sdoc_id) == []
    assert _spans(client, p["project"].id, sdoc_id) == []


# ===========================================================================
# CREATE PROJECT (/project) TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "create,enabled",
    [
        # without a feature list: the feature is off by default
        pytest.param(
            ProjectCreate(title="Default", description=""), False, id="default"
        ),
        # requested by name
        pytest.param(
            ProjectCreate(title="Coref", description="", enabled_features=[FEATURE]),
            True,
            id="requested",
        ),
    ],
)
def test_create_project_enables_coreference_resolution_only_on_request(
    client: TestClient, create: ProjectCreate, enabled: bool
):
    """A project created without a feature list does not enable coreference
    resolution; one created with it does."""
    response = client.put("/projects", json=create.model_dump(mode="json"))

    assert response.status_code == 200, response.text
    project = ProjectRead.model_validate(response.json())
    assert (FEATURE in project.enabled_features) is enabled
