"""Projects with features disabled, shared by the feature, project and gating tests."""

from typing import Protocol, TypedDict

import sqlalchemy as sa
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_orm import UserORM

FEATURE_PROJECT_TITLE = "Feature Project"

# The steps of a text document in a project without features.
MINIMAL_TEXT_STEPS = [
    "extract_html",
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_html_mapping",
]
MINIMAL_IMAGE_STEPS = ["image_metadata_extraction", "image_thumbnail"]


class FeatureProject(TypedDict):
    project: ProjectORM
    text_done: SourceDocumentORM
    text_running: SourceDocumentORM
    image: SourceDocumentORM


def create_project_with_features(
    db: Session, user: UserORM, *, title: str, features: list[Feature]
) -> ProjectORM:
    """Create a project of the user that enables only the given features."""
    read = ProjectService().create_project(
        db=db,
        create_dto=ProjectCreate(
            title=title, description="", enabled_features=features
        ),
        creating_user_id=user.id,
    )
    db.commit()
    return crud_project.read(db=db, id=read.id)


def _create_sdoc(
    db: Session,
    project: ProjectORM,
    *,
    name: str,
    doctype: DocType,
    status: dict[str, int],
) -> SourceDocumentORM:
    sdoc = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename=name, name=name, doctype=doctype, project_id=project.id
        ),
    )
    db.execute(
        sa.text(
            "UPDATE sourcedocument SET "
            + ", ".join(f"{c} = :{c}" for c in status)
            + " WHERE id = :id"
        ),
        {**status, "id": sdoc.id},
    )
    return sdoc


def create_feature_project(db: Session, user: UserORM) -> FeatureProject:
    """The project described in the fixtures that use `FeatureProject`."""
    project = create_project_with_features(
        db, user, title=FEATURE_PROJECT_TITLE, features=[]
    )
    text_done = _create_sdoc(
        db,
        project,
        name="text_done.txt",
        doctype=DocType.text,
        status=dict.fromkeys(MINIMAL_TEXT_STEPS, 1),
    )
    text_running = _create_sdoc(
        db,
        project,
        name="text_running.txt",
        doctype=DocType.text,
        status={
            "extract_html": 1,
            "text_extraction": 1,
            "text_language_detection": 0,
            "text_spacy": 0,
            "text_html_mapping": 0,
        },
    )
    image = _create_sdoc(
        db,
        project,
        name="image.png",
        doctype=DocType.image,
        status=dict.fromkeys(MINIMAL_IMAGE_STEPS, 1),
    )
    db.commit()
    for obj in (project, text_done, text_running, image):
        db.refresh(obj)
    return {
        "project": project,
        "text_done": text_done,
        "text_running": text_running,
        "image": image,
    }


FEATURELESS_PROJECT_TITLE = "Featureless Project"


class FeaturelessProject(TypedDict):
    project: ProjectORM
    sdoc: SourceDocumentORM


def create_featureless_project(db: Session, user: UserORM) -> FeaturelessProject:
    """The project described in the fixtures that use `FeaturelessProject`."""
    project = create_project_with_features(
        db, user, title=FEATURELESS_PROJECT_TITLE, features=[]
    )
    sdoc = _create_sdoc(
        db,
        project,
        name="text_done.txt",
        doctype=DocType.text,
        status=dict.fromkeys(MINIMAL_TEXT_STEPS, 1),
    )
    db.commit()
    db.refresh(project)
    db.refresh(sdoc)
    return {"project": project, "sdoc": sdoc}


class _Response(Protocol):
    @property
    def status_code(self) -> int: ...
    @property
    def text(self) -> str: ...


def assert_feature_disabled(response: _Response, feature: Feature) -> None:
    """The request was rejected because the feature is disabled in the project."""
    assert response.status_code == 403, response.text
    assert f"The feature '{feature.value}' is not enabled" in response.text
