"""The system codes of the features: their artefacts declare the code trees, and
Enable, the project creation and the project import create them (the set up of
the artefact system)."""

import zipfile

from sqlalchemy.orm import Session

from common.languages_enum import Language
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import create_project_with_features, feature_named
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_registry import feature_registry
from systems.feature_system.feature_service import FeatureService

from .conftest import CodeImportProjects

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)


def _codes(db: Session, project_id: int) -> dict[str, CodeORM]:
    """The codes of the project by name."""
    db.expire_all()
    codes = {
        c.name: c
        for c in crud_code.read_system_codes_by_project(db=db, project_id=project_id)
    }
    codes |= {
        name: code
        for name in ("NAMED_ENTITY", "PERSON")
        if (
            code := crud_code.read_by_name_and_project(
                db=db, code_name=name, project_id=project_id
            )
        )
        is not None
    }
    return codes


def _enable(db: Session, project_id: int, feature: str) -> None:
    FeatureService().enable_feature(
        db=db, project_id=project_id, feature=feature_named(feature), settings=SETTINGS
    )
    db.commit()


def _round_trip(db: Session, source: ProjectORM, target: ProjectORM) -> None:
    """Export the source project and import the archive into the target."""
    fsr = FilesystemRepo()
    archive = export_project(db=db, fsr=fsr, project_id=source.id)
    import_dir = fsr.create_temp_dir("system_codes_import")
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    import_project(db=db, fsr=fsr, path_to_dir=import_dir, project_id=target.id)
    db.commit()


# ===========================================================================
# ENABLE AND PROJECT CREATION
# ===========================================================================


def test_enable_entity_annotations_creates_the_entity_codes_and_disable_keeps_them(
    db_session: Session, test_user: UserORM
):
    """A project created without entity annotations has no `NAMED_ENTITY`;
    Enable creates it with its 19 entity types as system codes; Disable keeps
    them."""
    project = create_project_with_features(
        db_session, test_user, title="Entities Later", features=[]
    )
    assert "NAMED_ENTITY" not in _codes(db_session, project.id)

    _enable(db_session, project.id, "entity_annotations")

    codes = _codes(db_session, project.id)
    entity = codes["NAMED_ENTITY"]
    assert entity.is_system
    assert codes["PERSON"].parent_id == entity.id
    assert sum(c.parent_id == entity.id for c in codes.values()) == 19
    assert not codes["CARDINAL"].enabled

    FeatureService().disable_feature(
        db=db_session,
        project_id=project.id,
        feature=feature_named("entity_annotations"),
    )
    db_session.commit()
    assert "NAMED_ENTITY" in _codes(db_session, project.id)


def test_enable_object_detection_reuses_the_entity_person_code(
    db_session: Session, test_user: UserORM
):
    """Object detection declares `NAMED_ENTITY` > `PERSON` too: in a project with
    entity annotations, Enable reuses both codes and adds the COCO trees."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Entities And Objects",
        features=["entity_annotations"],
    )
    before = _codes(db_session, project.id)

    _enable(db_session, project.id, "object_detection")

    after = _codes(db_session, project.id)
    assert after["NAMED_ENTITY"].id == before["NAMED_ENTITY"].id
    assert after["PERSON"].id == before["PERSON"].id
    assert after["ANIMAL"].is_system
    assert after["BACKGROUND"].is_system


def test_a_project_with_all_features_has_the_system_codes_of_before(
    db_session: Session, test_user: UserORM
):
    """With every feature, a new project has the 135 system codes it had when
    they were configured: the root, the entity, COCO, mention and quotation
    trees."""
    project = create_project_with_features(
        db_session, test_user, title="All Features", features=feature_registry.names()
    )

    codes = _codes(db_session, project.id)
    assert len(codes) == 135
    assert all(code.is_system for code in codes.values())


# ===========================================================================
# PROJECT IMPORT
# ===========================================================================


def test_import_marks_a_declared_code_tree_as_system_codes(
    db_session: Session, code_import_projects: CodeImportProjects
):
    """The archive of entities_disabled holds `NAMED_ENTITY` but does not enable
    entity annotations: the import still creates the tree as system codes, so
    a later Enable of entity annotations succeeds instead of a 409."""
    p = code_import_projects

    _round_trip(db_session, p["entities_disabled"], p["target"])

    codes = _codes(db_session, p["target"].id)
    assert codes["NAMED_ENTITY"].is_system
    assert codes["PERSON"].is_system
    _enable(db_session, p["target"].id, "entity_annotations")
    assert (
        codes["NAMED_ENTITY"].id
        == _codes(db_session, p["target"].id)["NAMED_ENTITY"].id
    )


def test_import_keeps_a_top_level_user_code_named_like_a_system_code(
    db_session: Session, code_import_projects: CodeImportProjects
):
    """The top-level user code `NAMED_ENTITY` of user_named_entity has no
    parent, so it does not lie in the declared tree and stays a user code."""
    p = code_import_projects

    _round_trip(db_session, p["user_named_entity"], p["target"])

    code = crud_code.read_by_name_and_project(
        db=db_session, code_name="NAMED_ENTITY", project_id=p["target"].id
    )
    assert code is not None
    assert not code.is_system
    assert code.parent_id is None
