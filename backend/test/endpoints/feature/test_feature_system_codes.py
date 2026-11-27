"""The system codes of the features: their artefacts declare the code trees, and
Enable, the project creation and the project import create them (the set up of
the artefact system)."""

import zipfile

import pytest
from sqlalchemy.orm import Session

from common.languages_enum import Language
from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from dats_test_utils import new_temporary_folder
from feature_test_utils import create_project_with_features, feature_named
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.feature_system.feature_registry import feature_registry
from systems.feature_system.feature_service import FeatureService

from .conftest import CodeImportProjects

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
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
            code := crud_code.read_by_name(db=db, code_name=name, project_id=project_id)
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
    out_dir = new_temporary_folder()
    archive = export_project(db=db, out_dir=out_dir, project_id=source.id)
    import_dir = out_dir / "import"
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    import_project(db=db, path_to_dir=import_dir, project_id=target.id)
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


def test_enable_object_detection_adds_the_coco_trees_with_human_and_no_entities(
    db_session: Session, test_user: UserORM
):
    """Object detection declares the COCO trees with the top code `HUMAN` for
    the people it finds, and no named-entity code: Enable adds them below
    `SYSTEM_CODE` and leaves `NAMED_ENTITY` and `PERSON` out."""
    project = create_project_with_features(
        db_session, test_user, title="Objects Later", features=[]
    )

    _enable(db_session, project.id, "object_detection")

    codes = _codes(db_session, project.id)
    assert codes["HUMAN"].is_system
    assert codes["HUMAN"].parent_id == codes["SYSTEM_CODE"].id
    assert codes["ANIMAL"].parent_id == codes["SYSTEM_CODE"].id
    assert "NAMED_ENTITY" not in codes
    assert "PERSON" not in codes


def test_a_project_with_all_features_has_the_system_codes_of_before(
    db_session: Session, test_user: UserORM
):
    """With every feature, a new project has 136 system codes: the 135 it had
    when they were configured (the root, the entity, COCO, mention and
    quotation trees) and `HUMAN`, the code of the people object detection
    finds."""
    project = create_project_with_features(
        db_session, test_user, title="All Features", features=feature_registry.names()
    )

    codes = _codes(db_session, project.id)
    assert len(codes) == 136
    assert all(code.is_system for code in codes.values())


# ===========================================================================
# PROJECT IMPORT
# ===========================================================================


def test_import_marks_a_declared_code_tree_as_system_codes(
    db_session: Session, code_import_projects: CodeImportProjects
):
    """The archive of entities_disabled holds `NAMED_ENTITY` but does not enable
    entity annotations: the import still creates the tree as system codes,
    each enabled as declared (`CARDINAL` is declared disabled), so a later
    Enable of entity annotations succeeds instead of a 409."""
    p = code_import_projects

    _round_trip(db_session, p["entities_disabled"], p["target"])

    codes = _codes(db_session, p["target"].id)
    assert codes["NAMED_ENTITY"].is_system
    assert codes["PERSON"].is_system
    assert codes["PERSON"].enabled
    assert codes["CARDINAL"].is_system
    assert not codes["CARDINAL"].enabled
    _enable(db_session, p["target"].id, "entity_annotations")
    assert (
        codes["NAMED_ENTITY"].id
        == _codes(db_session, p["target"].id)["NAMED_ENTITY"].id
    )


def test_import_keeps_a_user_tree_whose_names_are_declared_below_its_user_parent(
    db_session: Session, code_import_projects: CodeImportProjects
):
    """`DOG` is declared below `ANIMAL`, and user_animals has it below its user
    code `ANIMAL`: as that parent is no system code, both stay user codes."""
    p = code_import_projects

    _round_trip(db_session, p["user_animals"], p["target"])

    for name in ("ANIMAL", "DOG"):
        code = crud_code.read_by_name(
            db=db_session, code_name=name, project_id=p["target"].id
        )
        assert code is not None, name
        assert not code.is_system, name


def test_import_keeps_a_top_level_user_code_named_like_a_system_code(
    db_session: Session, code_import_projects: CodeImportProjects
):
    """The top-level user code `NAMED_ENTITY` of user_named_entity has no
    parent, so it does not lie in the declared tree and stays a user code."""
    p = code_import_projects

    _round_trip(db_session, p["user_named_entity"], p["target"])

    code = crud_code.read_by_name(
        db=db_session, code_name="NAMED_ENTITY", project_id=p["target"].id
    )
    assert code is not None
    assert not code.is_system
    assert code.parent_id is None


@pytest.mark.parametrize(
    "target_key",
    [
        # the target has no entity codes: the import creates them once
        pytest.param("target", id="target-without-the-codes"),
        # the target has the entity codes already: the import reuses them
        pytest.param("entity_target", id="target-with-the-codes"),
    ],
)
def test_import_of_entity_spans_keeps_the_annotations_on_one_set_of_system_codes(
    db_session: Session,
    test_user: UserORM,
    code_import_projects: CodeImportProjects,
    target_key: str,
):
    """The archive of entity_spans holds `NAMED_ENTITY` > `PERSON` and the spans
    "Ada" and "Alan" with `PERSON`: the import neither rejects nor duplicates
    the codes, enables entity annotations and keeps both spans on the one
    system code `PERSON`."""
    p = code_import_projects
    target = p[target_key]

    _round_trip(db_session, p["entity_spans"], target)

    db_session.expire_all()
    for name in ("NAMED_ENTITY", "PERSON"):
        code = crud_code.read_by_name(db_session, code_name=name, project_id=target.id)
        assert code is not None and code.is_system
    person = _codes(db_session, target.id)["PERSON"]
    assert person.parent_id == _codes(db_session, target.id)["NAMED_ENTITY"].id
    [sdoc] = crud_sdoc.read_by_project(
        db=db_session, project_id=target.id, only_finished=False
    )
    spans = crud_span_anno.read_by_user_and_sdoc(
        db=db_session, project_id=target.id, user_id=test_user.id, sdoc_id=sdoc.id
    )
    assert sorted((s.span_text.text, s.code_id) for s in spans) == [
        ("Ada", person.id),
        ("Alan", person.id),
    ]
    db_session.refresh(target)
    assert "entity_annotations" in target.enabled_features
