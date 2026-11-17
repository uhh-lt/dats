"""Projects with features disabled, shared by the feature, project and gating tests."""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Protocol, TypedDict

from PIL import Image
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import FeatureArea
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.doc_processing.sentence_embeddings.sentence_embedding_crud import (
    crud_sentence_embedding,
)
from core.doc_processing.sentence_embeddings.sentence_embedding_dto import (
    SentenceObjectIdentifier,
)
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from pipeline_test_utils import artefact_named, core_steps, set_step_status
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.feature_system.feature_registry import (
    Feature,
    feature_registry,
    register_feature,
)

FEATURE_PROJECT_TITLE = "Feature Project"

# the text of every text document of the projects below
SDOC_SENTENCES = ["Hello world.", "The cat sits on the mat."]


def feature_named(name: str) -> Feature:
    """The registered feature of this name: tests name features by text and
    never import a feature object from a module path."""
    feature = feature_registry.feature(name)
    assert feature is not None, f"no feature '{name}' is registered"
    return feature


@contextmanager
def off_by_default_feature() -> Generator[Feature, None, None]:
    """Register the test feature "test_off_by_default" (title "Test Off By
    Default", area Analysis, requires the keywords) with
    `default_enabled=False` while the context is open: a new project does not
    enable it."""
    feature = register_feature(
        "test_off_by_default",
        title="Test Off By Default",
        description="A test feature that a new project does not enable.",
        area=FeatureArea.ANALYSIS,
        requires_artefacts={artefact_named("keywords")},
        default_enabled=False,
    )
    try:
        yield feature
    finally:
        feature_registry.unregister_feature(feature.name)


def minimal_text_steps() -> list[str]:
    """The steps of a text document in a project without features."""
    return core_steps(DocType.text)


def minimal_image_steps() -> list[str]:
    """The steps of an image document in a project without features."""
    return core_steps(DocType.image)


class FeatureProject(TypedDict):
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default and has no
    documents):

    - project: "Feature Project" of `test_user`, without any enabled feature
    Every text document has the text of `SDOC_SENTENCES` ("Hello world." and
    "The cat sits on the mat.") and the language "en", the image an 8x8 red PNG
    as its file, so the step jobs a computation starts can be enriched.

    - text_done: text document "text_done.txt"; the steps of a project without
      features are finished (extract_html, text_extraction,
      text_language_detection, text_es_index, text_spacy, text_html_mapping),
      all other steps are not planned
    - text_running: text document "text_running.txt"; extract_html,
      text_extraction and text_language_detection are finished, text_es_index,
      text_spacy and text_html_mapping are processing, all other steps are not
      planned
    - image: image document "image.png"; the steps of an image in a project
      without features are finished (image_metadata_extraction,
      image_thumbnail, image_caption and the text steps after it:
      text_extraction, text_language_detection, text_es_index, text_spacy,
      text_html_mapping), all other steps are not planned

    Non-obvious derived behavior:

    - A feature's steps include the core steps it needs: keyword statistics on
      text needs extract_html, text_extraction, text_language_detection and
      text_keywords (not text_spacy, keywords need no tokens), so the keywords
      of text_running can start at once.
    - Every image has a caption, so features that need text apply to the
      image too; image features (object detection)
      apply to the image only; semantic search applies to every document
      (sentence embeddings for all, image embeddings for the image).
    """

    project: ProjectORM
    text_done: SourceDocumentORM
    text_running: SourceDocumentORM
    image: SourceDocumentORM


def create_project_with_features(
    db: Session, user: UserORM, *, title: str, features: list[str]
) -> ProjectORM:
    """Create a project of the user that enables only the given features,
    named by text."""
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
    """A document with the data its step jobs read, so they can start: every
    document has the text of `SDOC_SENTENCES` (data row, tokens, sentences)
    and the language "en" (for an image: its caption), an image an 8x8 red
    PNG as its file. The given
    steps get the given status, the others are not planned."""
    sdoc = create_text_document(
        db,
        project=project,
        filename=name,
        name=name,
        sentences=SDOC_SENTENCES,
        doctype=doctype,
    )
    if doctype == DocType.image:
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
            "text_language_detection": 1,
            "text_es_index": 0,
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

    - project: "Partly Available Project" of `test_user`, with only keyword
      statistics enabled
    - five text documents with the text of `SDOC_SENTENCES` and the language
      "en"; the minimal text steps are extract_html, text_extraction,
      text_language_detection, text_es_index, text_spacy, text_html_mapping;
      steps not listed are not planned:
      - with_keywords: minimal steps and text_keywords finished
      - keywords_failed: minimal steps finished, text_keywords erroneous
      - without_keywords: minimal steps finished (text_keywords not planned)
      - extraction_failed: extract_html finished, text_extraction and the
        minimal steps after it erroneous
      - spacy_failed: extract_html, text_extraction, text_language_detection,
        text_es_index finished, text_spacy erroneous

    Non-obvious derived behavior:

    - Keyword statistics needs extract_html, text_extraction,
      text_language_detection and text_keywords, so it covers with_keywords
      only: keywords_failed and extraction_failed count as failed,
      without_keywords and spacy_failed as not planned; it is partly available.
    """

    project: ProjectORM
    with_keywords: SourceDocumentORM
    keywords_failed: SourceDocumentORM
    without_keywords: SourceDocumentORM
    extraction_failed: SourceDocumentORM
    spacy_failed: SourceDocumentORM


def create_partly_project(db: Session, user: UserORM) -> PartlyProject:
    """The project described in the fixtures that use `PartlyProject`."""
    project = create_project_with_features(
        db, user, title=PARTLY_PROJECT_TITLE, features=["keyword_statistics"]
    )
    done = dict.fromkeys(minimal_text_steps(), 1)
    sdocs = {
        "with_keywords": {**done, "text_keywords": 1},
        "keywords_failed": {**done, "text_keywords": -100},
        "without_keywords": done,
        "extraction_failed": {
            "extract_html": 1,
            "text_extraction": -100,
            "text_language_detection": -100,
            "text_es_index": -100,
            "text_spacy": -100,
            "text_html_mapping": -100,
        },
        "spacy_failed": {
            "extract_html": 1,
            "text_extraction": 1,
            "text_language_detection": 1,
            "text_es_index": 1,
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
        "with_keywords": created["with_keywords"],
        "keywords_failed": created["keywords_failed"],
        "without_keywords": created["without_keywords"],
        "extraction_failed": created["extraction_failed"],
        "spacy_failed": created["spacy_failed"],
    }


FEATURELESS_PROJECT_TITLE = "Featureless Project"


class FeaturelessProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" with the text of `SDOC_SENTENCES` and
      the language "en"; the steps of a project without features are finished,
      and its entry of the search index (filename and content) is stored
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
    es_client = ElasticSearchRepo().get_client()
    crud_sdoc_elastic.create(
        client=es_client,
        project_id=project.id,
        create_dto=ElasticSearchDocumentCreate(
            project_id=project.id,
            sdoc_id=sdoc.id,
            filename=sdoc.filename,
            content=" ".join(SDOC_SENTENCES),
        ),
    )
    # a search sees the entry only after a refresh of the index
    es_client.indices.refresh(
        index=crud_sdoc_elastic.index.get_index_name(project_id=project.id)
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


def assert_feature_disabled(response: _Response, feature: str) -> None:
    """The request was rejected because the feature is disabled in the project."""
    assert response.status_code == 403, response.text
    assert f"The feature '{feature}' is not enabled" in response.text


class SentenceEmbeddingProject(TypedDict):
    """
    A project built by `create_sentence_embedding_project`:

    - project: of the user, enabling only the given features (never semantic
      search)
    - text: text document "text.txt" with the text of `SDOC_SENTENCES`
      ("Hello world." and "The cat sits on the mat.") and the language "en";
      its core steps and text_sentence_embedding are finished; sentence 0 has
      the sentence embedding [1, 0], sentence 1 [0, 1]

    Non-obvious derived behavior:

    - A query that CLIP embeds to [1, 0] finds sentence 0 with certainty 1.0
      and sentence 1 with certainty 0.5.
    """

    project: ProjectORM
    text: SourceDocumentORM


def create_sentence_embedding_project(
    db: Session, user: UserORM, *, title: str, features: list[str]
) -> SentenceEmbeddingProject:
    """The project described in `SentenceEmbeddingProject`."""
    project = create_project_with_features(db, user, title=title, features=features)
    text = _create_sdoc(
        db,
        project,
        name="text.txt",
        doctype=DocType.text,
        status={**dict.fromkeys(minimal_text_steps(), 1), "text_sentence_embedding": 1},
    )
    crud_sentence_embedding.create_multi(
        client=WeaviateRepo().get_client(),
        project_id=project.id,
        ids=[
            SentenceObjectIdentifier(sdoc_id=text.id, sentence_id=i) for i in range(2)
        ],
        embeddings=[[1.0, 0.0], [0.0, 1.0]],
    )
    db.commit()
    return {"project": project, "text": text}
