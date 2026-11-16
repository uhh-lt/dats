"""The set up of a feature: the system codes its artefacts declare and then its
set-up hook run on Enable, on a project creation and on a project import that
enable the feature, before anything needs them; never on Disable."""

import zipfile

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.job_type_enum import JobType
from common.languages_enum import Language
from core.code.code_crud import crud_code
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import create_project_with_features
from job_test_utils import HeldJobs
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_dto import FeatureActivation
from systems.feature_system.feature_registry import Feature
from systems.feature_system.feature_service import FeatureService

from .conftest import HOOK_FINDS_ALL, HookedFeature

CODE_NAMES = ["TEST_CODED_TREE", "TEST_CODED_LEAF"]

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)


def _codes(db: Session, project_id: int) -> dict[str, bool]:
    """The codes of `CODED_TREE` in the project, with whether each is a system
    code."""
    db.expire_all()
    result = {}
    for name in CODE_NAMES:
        code = crud_code.read_by_name_and_project(
            db=db, code_name=name, project_id=project_id
        )
        if code is not None:
            result[name] = code.is_system
    db.commit()
    return result


def _project(db: Session, user: UserORM, title: str, features: list[str]) -> ProjectORM:
    return create_project_with_features(db, user, title=title, features=features)


def test_enable_creates_the_codes_and_disable_keeps_them(
    client: TestClient, db_session: Session, test_user: UserORM, coded_feature: Feature
):
    """Enable of the feature creates the code tree of its artefact as system
    codes; Disable leaves them."""
    project = _project(db_session, test_user, "Set Up Enable", [])
    assert _codes(db_session, project.id) == {}

    base = f"/feature/project/{project.id}/{coded_feature.name}"
    enabled = client.post(
        f"{base}/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )
    assert enabled.status_code == 200, enabled.text
    assert _codes(db_session, project.id) == dict.fromkeys(CODE_NAMES, True)

    disabled = client.post(f"{base}/disable")
    assert disabled.status_code == 200, disabled.text
    assert _codes(db_session, project.id) == dict.fromkeys(CODE_NAMES, True)


def test_project_creation_with_the_feature_creates_the_codes(
    db_session: Session, test_user: UserORM, coded_feature: Feature
):
    """A project created with the feature has the code tree; one created
    without it (the feature is off by default) does not."""
    with_feature = _project(db_session, test_user, "With", [coded_feature.name])
    without = _project(db_session, test_user, "Without", [])

    assert _codes(db_session, with_feature.id) == dict.fromkeys(CODE_NAMES, True)
    assert _codes(db_session, without.id) == {}


def test_add_features_alone_creates_no_codes(
    db_session: Session, test_user: UserORM, coded_feature: Feature
):
    """`add_features` (the last step of an import) only enables the feature:
    the import sets up before it, so it creates no codes itself."""
    project = _project(db_session, test_user, "Add Features", [])

    FeatureService().add_features(
        db=db_session, project_id=project.id, features=[coded_feature]
    )
    db_session.commit()

    assert _codes(db_session, project.id) == {}


def test_import_creates_the_codes_before_it_imports_the_archived_codes(
    db_session: Session, test_user: UserORM, coded_feature: Feature
):
    """An archive of a project that enables the feature holds its code tree as
    plain codes. The import sets up the feature first, so the archived codes
    meet the system codes by name and stay system codes; without the set up
    they would be imported as user codes."""
    source = _project(db_session, test_user, "Import Source", [coded_feature.name])
    target = _project(db_session, test_user, "Import Target", [])
    fsr = FilesystemRepo()
    archive = export_project(db=db_session, fsr=fsr, project_id=source.id)
    import_dir = fsr.create_temp_dir("set_up_import")
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)

    import_project(db=db_session, fsr=fsr, path_to_dir=import_dir, project_id=target.id)
    db_session.commit()

    assert _codes(db_session, target.id) == dict.fromkeys(CODE_NAMES, True)


# ===========================================================================
# SET-UP HOOK OF A FEATURE
# ===========================================================================


def test_enable_runs_the_set_up_hook_after_the_codes_and_disable_does_not(
    client: TestClient,
    db_session: Session,
    test_user: UserORM,
    hooked_feature: HookedFeature,
):
    """Enable runs the hook once, in the complete project after the declared
    system codes exist;
    Disable runs nothing, and Enable again runs the hook again."""
    project = _project(db_session, test_user, "Hook Enable", [])
    base = f"/feature/project/{project.id}/{hooked_feature['feature'].name}"
    activation = FeatureActivation(settings=SETTINGS).model_dump(mode="json")

    assert client.post(f"{base}/enable", json=activation).status_code == 200
    assert hooked_feature["calls"] == [(project.id, HOOK_FINDS_ALL)]

    assert client.post(f"{base}/disable").status_code == 200
    assert hooked_feature["calls"] == [(project.id, HOOK_FINDS_ALL)]

    assert client.post(f"{base}/enable", json=activation).status_code == 200
    assert hooked_feature["calls"] == [
        (project.id, HOOK_FINDS_ALL),
        (project.id, HOOK_FINDS_ALL),
    ]


def test_project_creation_runs_the_set_up_hook_of_its_features_only(
    db_session: Session, test_user: UserORM, hooked_feature: HookedFeature
):
    """A project created with the feature runs its hook in the complete
    project, after its codes, metadata, search index and Weaviate tenants; one
    created without it does not."""
    with_feature = _project(
        db_session, test_user, "Hook With", [hooked_feature["feature"].name]
    )
    _project(db_session, test_user, "Hook Without", [])

    assert hooked_feature["calls"] == [(with_feature.id, HOOK_FINDS_ALL)]


def test_import_runs_the_set_up_hook_of_the_archived_features(
    db_session: Session, test_user: UserORM, hooked_feature: HookedFeature
):
    """Importing an archive of a project with the feature runs the hook in the
    target project, after its codes; `add_features` at the end of the import
    runs it no second time."""
    source = _project(
        db_session, test_user, "Hook Source", [hooked_feature["feature"].name]
    )
    target = _project(db_session, test_user, "Hook Target", [])
    fsr = FilesystemRepo()
    archive = export_project(db=db_session, fsr=fsr, project_id=source.id)
    import_dir = fsr.create_temp_dir("hook_import")
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)

    import_project(db=db_session, fsr=fsr, path_to_dir=import_dir, project_id=target.id)
    db_session.commit()

    assert hooked_feature["calls"] == [
        (source.id, HOOK_FINDS_ALL),
        (target.id, HOOK_FINDS_ALL),
    ]


def test_complete_does_not_run_the_set_up_hook(
    client: TestClient,
    hooked_feature: HookedFeature,
    hooked_partly_project: ProjectORM,
    held_jobs: HeldJobs,
):
    """Completing the partly available feature computes its data and runs no
    set up: the hook keeps the one call of the project creation, also after
    the artefact computation planned the document."""
    project_id = hooked_partly_project.id
    assert hooked_feature["calls"] == [(project_id, HOOK_FINDS_ALL)]

    response = client.post(
        f"/feature/project/{project_id}/{hooked_feature['feature'].name}/complete",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 200, response.text
    held_jobs.run(JobType.ARTEFACT_COMPUTATION)
    assert hooked_feature["calls"] == [(project_id, HOOK_FINDS_ALL)]
