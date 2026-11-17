"""The feature quotation detection: what it requires, that a new project leaves
it off, and that Enable reuses the quotation codes a project has."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.languages_enum import Language
from core.code.code_crud import crud_code
from core.project.project_dto import ProjectCreate, ProjectRead
from core.project.project_orm import ProjectORM
from feature_test_utils import feature_named
from job_test_utils import HeldJobs
from pipeline_test_utils import artefact_named
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivation

FEATURE = "quotation_detection"

# QUOTATIONS and its nine descendants
QUOTATION_CODE_NAMES = {
    "QUOTATIONS",
    "QUOTE",
    "DIRECT",
    "INDIRECT",
    "REPORTED",
    "FREE_INDIRECT",
    "INDIRECT_FREE_INDIRECT",
    "SPEAKER",
    "CUE",
    "ADDRESSEE",
    "FRAME",
}

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    language=Language.german,
    model="default",
)


def _quotation_codes(db: Session, project_id: int) -> dict[str, int]:
    """The ids of the project's quotation codes by name."""
    db.expire_all()
    return {
        code.name: code.id
        for code in crud_code.read_system_codes_by_project(db=db, project_id=project_id)
        if code.name in QUOTATION_CODE_NAMES
    }


def test_quotation_detection_requires_the_quotations_only() -> None:
    """The feature reads the quotations and no other artefact."""
    assert feature_named(FEATURE).requires_artefacts == {artefact_named("quotations")}


def test_create_project_leaves_quotation_detection_off_unless_requested(
    client: TestClient,
):
    """A project created without `enabled_features` does not enable quotation
    detection (it runs a hosted model for every German text document); one that
    names it enables it."""
    default = client.put("/project", json={"title": "Default", "description": ""})
    requested = client.put(
        "/project",
        json=ProjectCreate(
            title="Requested", description="", enabled_features=[FEATURE]
        ).model_dump(mode="json"),
    )

    assert default.status_code == 200, default.text
    assert FEATURE not in ProjectRead.model_validate(default.json()).enabled_features
    assert requested.status_code == 200, requested.text
    assert ProjectRead.model_validate(requested.json()).enabled_features == [FEATURE]


def test_enable_creates_the_quotation_codes_disable_keeps_them_and_enable_reuses_them(
    client: TestClient,
    db_session: Session,
    plain_project: ProjectORM,
    held_jobs: HeldJobs,
):
    """A project without quotation detection has no quotation code; Enable
    creates the tree as system codes; Disable keeps it; a second Enable reuses
    the same codes and creates no second tree."""
    path = f"/feature/project/{plain_project.id}/{FEATURE}"
    activation = FeatureActivation(settings=SETTINGS).model_dump(mode="json")
    assert _quotation_codes(db_session, plain_project.id) == {}

    enabled = client.post(f"{path}/enable", json=activation)
    created = _quotation_codes(db_session, plain_project.id)
    disabled = client.post(f"{path}/disable")
    kept = _quotation_codes(db_session, plain_project.id)
    enabled_again = client.post(f"{path}/enable", json=activation)

    for response in (enabled, disabled, enabled_again):
        assert response.status_code == 200, response.text
    assert set(created) == QUOTATION_CODE_NAMES
    assert kept == created
    assert _quotation_codes(db_session, plain_project.id) == created
    assert sum(
        code.name in QUOTATION_CODE_NAMES
        for code in crud_code.read_system_codes_by_project(
            db=db_session, project_id=plain_project.id
        )
    ) == len(QUOTATION_CODE_NAMES)
