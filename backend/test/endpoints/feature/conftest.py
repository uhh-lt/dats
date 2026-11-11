from typing import Generator, TypedDict
from unittest.mock import patch

import pytest

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import (
    MINIMAL_IMAGE_STEPS,
    MINIMAL_TEXT_STEPS,
    FeatureProject,
    PartlyProject,
    _create_sdoc,
    create_feature_project,
    create_partly_project,
    create_project_with_features,
    set_step_status,
)
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`."""
    return create_feature_project(db_session, test_user)


@pytest.fixture(scope="function")
def partly_project(db_session, test_user: UserORM) -> PartlyProject:
    """The project described in `PartlyProject`."""
    return create_partly_project(db_session, test_user)


class ImageTextProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Image Text Project" of `test_user`, with full-text search,
      sentence similarity search and keyword statistics enabled (no image
      captions)
    - image: image document "image.png"; image_metadata_extraction and
      image_thumbnail are finished, all other steps are not planned

    Non-obvious derived behavior:

    - Without image captions an image has no text, so the three enabled text
      features do not apply to it; enabling image captions makes their steps
      possible for the image.
    """

    project: ProjectORM
    image: SourceDocumentORM


@pytest.fixture(scope="function")
def image_text_project(db_session, test_user: UserORM) -> ImageTextProject:
    """The project described in `ImageTextProject`."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Image Text Project",
        features=[
            Feature.FULL_TEXT_SEARCH,
            Feature.SENTENCE_SIMILARITY_SEARCH,
            Feature.KEYWORD_STATISTICS,
        ],
    )
    image = _create_sdoc(
        db_session,
        project,
        name="image.png",
        doctype=DocType.image,
        status=dict.fromkeys(MINIMAL_IMAGE_STEPS, 1),
    )
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(image)
    return {"project": project, "image": image}


class ActivationProject(TypedDict):
    """
    This fixture sets up the following project, for activations that run the
    real worker (Ray included):

    - project: "Activation Project" of `test_user`, without any enabled feature
    - tokenized: text document "tokenized.txt" with the sentences "Hello
      world." and "The cat sits on the mat." and the language "en"; the steps of
      a project without features are finished (extract_html, text_extraction,
      text_language_detection, text_spacy, text_html_mapping), all other steps
      are not planned
    - extracted: text document "extracted.txt" with the same text; only
      extract_html and text_extraction are finished, all other steps are not
      planned
    - no_data: text document "no_data.txt" without any content (no
      SourceDocumentData); the steps of a project without features are finished

    Non-obvious derived behavior:

    - No step job of no_data can start: its enricher finds no content, so every
      step an activation plans for it becomes erroneous.
    - An activation plans the not planned core steps of extracted too, so it
      runs the whole text chain from the language detection on.
    """

    project: ProjectORM
    tokenized: SourceDocumentORM
    extracted: SourceDocumentORM
    no_data: SourceDocumentORM


@pytest.fixture(scope="function")
def activation_project(db_session, test_user: UserORM) -> ActivationProject:
    """The project described in `ActivationProject`."""
    project = create_project_with_features(
        db_session, test_user, title="Activation Project", features=[]
    )
    sentences = ["Hello world.", "The cat sits on the mat."]
    tokenized = create_text_document(
        db_session,
        project=project,
        filename="tokenized.txt",
        name="tokenized.txt",
        sentences=sentences,
    )
    extracted = create_text_document(
        db_session,
        project=project,
        filename="extracted.txt",
        name="extracted.txt",
        sentences=sentences,
    )
    db_session.flush()
    set_step_status(db_session, tokenized.id, dict.fromkeys(MINIMAL_TEXT_STEPS, 1))
    set_step_status(db_session, extracted.id, {"extract_html": 1, "text_extraction": 1})
    no_data = _create_sdoc(
        db_session,
        project,
        name="no_data.txt",
        doctype=DocType.text,
        status=dict.fromkeys(MINIMAL_TEXT_STEPS, 1),
    )
    db_session.commit()
    for obj in (project, tokenized, extracted, no_data):
        db_session.refresh(obj)
    return {
        "project": project,
        "tokenized": tokenized,
        "extracted": extracted,
        "no_data": no_data,
    }


@pytest.fixture(scope="function")
def started_jobs() -> Generator[list[tuple[JobType, JobInputBase]], None, None]:
    """Captures the jobs the API starts instead of enqueueing them, so a feature
    activation does not run the preprocessing."""
    started: list[tuple[JobType, JobInputBase]] = []

    def _start_job(job_type: JobType, payload: JobInputBase, priority=None) -> None:
        started.append((job_type, payload))

    with patch.object(JobService, "start_job", side_effect=_start_job):
        yield started
