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
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
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
    """The feature reads the quotations and builds on no other feature."""
    feature = feature_named(FEATURE)

    assert feature.requires_artefacts == {artefact_named("quotations")}
    assert feature.requires_features == frozenset()


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


def test_enable_quotation_detection_reuses_the_quotation_codes_of_the_project(
    client: TestClient,
    db_session: Session,
    plain_project: ProjectORM,
    held_jobs: HeldJobs,
):
    """Enable keeps the quotation codes the project has: same ids, no second
    tree."""
    before = _quotation_codes(db_session, plain_project.id)

    response = client.post(
        f"/feature/project/{plain_project.id}/{FEATURE}/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 200, response.text
    assert set(before) == QUOTATION_CODE_NAMES
    assert _quotation_codes(db_session, plain_project.id) == before
    assert sum(
        code.name in QUOTATION_CODE_NAMES
        for code in crud_code.read_system_codes_by_project(
            db=db_session, project_id=plain_project.id
        )
    ) == len(QUOTATION_CODE_NAMES)
