"""Projects with features disabled, shared by the feature, project and gating tests."""

from typing import Protocol, TypedDict

from PIL import Image
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate, SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from pipeline_test_utils import core_steps, set_step_status, step_names
from repos.filesystem_repo import FilesystemRepo

FEATURE_PROJECT_TITLE = "Feature Project"

# the text of every text document of the projects below
SDOC_SENTENCES = ["Hello world.", "The cat sits on the mat."]


def minimal_text_steps() -> list[str]:
    """The steps of a text document in a project without features."""
    return step_names(core_steps(DocType.text))


def minimal_image_steps() -> list[str]:
    """The steps of an image document in a project without features."""
    return step_names(core_steps(DocType.image))


class FeatureProject(TypedDict):
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables all features and has no documents):

    - project: "Feature Project" of `test_user`, without any enabled feature
    Every text document has the text of `SDOC_SENTENCES` ("Hello world." and
    "The cat sits on the mat.") and the language "en", the image an 8x8 red PNG
    as its file, so the step jobs an activation starts can be enriched.

    - text_done: text document "text_done.txt"; the steps of a project without
      features are finished (extract_html, text_extraction,
      text_language_detection, text_spacy, text_html_mapping), all other steps
      are not planned
    - text_running: text document "text_running.txt"; extract_html and
      text_extraction are finished, text_language_detection, text_spacy and
      text_html_mapping are processing, all other steps are not planned
    - image: image document "image.png"; image_metadata_extraction and
      image_thumbnail are finished, all other steps are not planned (no caption,
      so no text steps)

    Non-obvious derived behavior:

    - A feature's steps include the core steps it needs: keyword statistics on
      text needs extract_html, text_extraction, text_language_detection and
      text_keywords (not text_spacy, keywords need no tokens), so
      text_running misses text_language_detection.
    - Features that need text apply to the two text documents only; image
      features (object detection, image captions, image similarity search) to
      the image only.
    """

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
    """A document with the data its step jobs read, so they can start: a text
    document has the text of `SDOC_SENTENCES` (data row, tokens, sentences)
    and the language "en", an image an 8x8 red PNG as its file. The given
    steps get the given status, the others are not planned."""
    if doctype == DocType.text:
        sdoc = create_text_document(
            db, project=project, filename=name, name=name, sentences=SDOC_SENTENCES
        )
    else:
        sdoc = crud_sdoc.create(
            db=db,
            create_dto=SourceDocumentCreate(
                filename=name, name=name, doctype=doctype, project_id=project.id
            ),
        )
        _write_image_file(sdoc)
    set_step_status(db, sdoc.id, status)
    return sdoc


def _write_image_file(sdoc: SourceDocumentORM) -> None:
    """Store a small PNG as the file of the image document."""
    path = FilesystemRepo().get_path_to_sdoc_file(
        SourceDocumentRead.model_validate(sdoc)
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (8, 8), (255, 0, 0)).save(path, format="PNG")


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
        status=dict.fromkeys(minimal_text_steps(), 1),
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
        status=dict.fromkeys(minimal_image_steps(), 1),
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


PARTLY_PROJECT_TITLE = "Partly Available Project"


class PartlyProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Partly Available Project" of `test_user`, with only full-text
      search enabled
    - five text documents with the text of `SDOC_SENTENCES` and the language
      "en"; the minimal text steps are extract_html,
      text_extraction, text_language_detection, text_spacy, text_html_mapping;
      steps not listed are not planned:
      - indexed: minimal steps and text_es_index finished
      - index_failed: minimal steps finished, text_es_index erroneous
      - not_indexed: minimal steps finished (text_es_index not planned)
      - extraction_failed: extract_html finished, text_extraction and the
        minimal steps after it erroneous
      - spacy_failed: extract_html, text_extraction, text_language_detection
        finished, text_spacy erroneous

    Non-obvious derived behavior:

    - Full-text search needs extract_html, text_extraction and text_es_index, so
      it covers indexed only: index_failed and extraction_failed count as failed,
      not_indexed and spacy_failed as not planned; it is partly available.
    """

    project: ProjectORM
    indexed: SourceDocumentORM
    index_failed: SourceDocumentORM
    not_indexed: SourceDocumentORM
    extraction_failed: SourceDocumentORM
    spacy_failed: SourceDocumentORM


def create_partly_project(db: Session, user: UserORM) -> PartlyProject:
    """The project described in the fixtures that use `PartlyProject`."""
    project = create_project_with_features(
        db, user, title=PARTLY_PROJECT_TITLE, features=[Feature.FULL_TEXT_SEARCH]
    )
    done = dict.fromkeys(minimal_text_steps(), 1)
    sdocs = {
        "indexed": {**done, "text_es_index": 1},
        "index_failed": {**done, "text_es_index": -100},
        "not_indexed": done,
        "extraction_failed": {
            "extract_html": 1,
            "text_extraction": -100,
            "text_language_detection": -100,
            "text_spacy": -100,
            "text_html_mapping": -100,
        },
        "spacy_failed": {
            "extract_html": 1,
            "text_extraction": 1,
            "text_language_detection": 1,
            "text_spacy": -100,
        },
    }
    created = {
        key: _create_sdoc(
            db, project, name=f"{key}.txt", doctype=DocType.text, status=status
        )
        for key, status in sdocs.items()
    }
    db.commit()
    db.refresh(project)
    for sdoc in created.values():
        db.refresh(sdoc)
    return {
        "project": project,
        "indexed": created["indexed"],
        "index_failed": created["index_failed"],
        "not_indexed": created["not_indexed"],
        "extraction_failed": created["extraction_failed"],
        "spacy_failed": created["spacy_failed"],
    }


FEATURELESS_PROJECT_TITLE = "Featureless Project"


class FeaturelessProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" with the text of `SDOC_SENTENCES` and
      the language "en"; the steps of a project without features are finished
    """

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
        status=dict.fromkeys(minimal_text_steps(), 1),
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
