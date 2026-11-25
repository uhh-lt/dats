from typing import TypedDict
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_orm import ProjectORM
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import (
    create_project_with_features,
    minimal_image_steps,
    minimal_text_steps,
)
from pipeline_test_utils import artefact_named, set_step_status
from systems.artefact_system.artefact_service import ArtefactService

# the German text of german_text and german_image; whitespace tokens:
# 0 "Anna", 1 "liest", 2 "ein", 3 "Buch.", 4 "Sie", 5 "mag", 6 "es", 7 "sehr."
GERMAN_SENTENCES = ["Anna liest ein Buch.", "Sie mag es sehr."]
ENGLISH_SENTENCES = ["Anna reads a book.", "She likes it a lot."]


class CorefProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Coref Project" of `test_user`, without any enabled feature; it
      has the system code MENTION (below `SYSTEM_CODE`), as after an earlier
      Enable and Disable of coreference resolution
    - mention: the code MENTION of the project
    - german_text: text document "german.txt" with the text of
      `GERMAN_SENTENCES` ("Anna liest ein Buch." and "Sie mag es sehr.") and the
      language "de"
    - english_text: text document "english.txt" with the text of
      `ENGLISH_SENTENCES` and the language "en"
    - german_image: image document "german.png" whose caption is the text of
      `GERMAN_SENTENCES`, with the language "de"; it has no image file
    - formerly_german: text document "formerly_german.txt" with the text of
      `ENGLISH_SENTENCES` and the language "en", holding the output of an
      earlier run (when it was German): the system user's MENTION spans "Anna"
      and "She" in one span group "coref"; its step coreference_resolution is
      finished
    The steps of a project without features are finished for every document,
    all other steps are not planned. Only formerly_german has annotations.

    Non-obvious derived behavior:

    - The tokens are the whitespace-separated words, so a token of a sentence
      end includes its period ("Buch.").
    - The coreference step follows tokens_sentences, which runs for every doctype, so
      it is planned for the image too, where it finishes without output.
    """

    project: ProjectORM
    mention: CodeORM
    german_text: SourceDocumentORM
    english_text: SourceDocumentORM
    german_image: SourceDocumentORM
    formerly_german: SourceDocumentORM


def _create_sdoc(
    db: Session,
    project: ProjectORM,
    *,
    name: str,
    doctype: DocType,
    sentences: list[str],
    language: str,
) -> SourceDocumentORM:
    sdoc = create_text_document(
        db,
        project=project,
        filename=name,
        name=name,
        sentences=sentences,
        doctype=doctype,
    )
    crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, project_id=sdoc.project_id, sdoc_id=sdoc.id, key="language"
    ).str_value = language
    steps = minimal_text_steps() if doctype == DocType.text else minimal_image_steps()
    set_step_status(db, sdoc.id, dict.fromkeys(steps, 1))
    return sdoc


def _store_earlier_mentions(
    db: Session, sdoc: SourceDocumentORM, code_id: int, words: list[str]
) -> None:
    """Store the words (single tokens) as MENTION spans of the system user in one
    span group "coref", as a run of the step does."""
    data = crud_sdoc_data.read(db=db, project_id=sdoc.project_id, id=sdoc.id)
    adoc = crud_adoc.exists_or_create(
        db=db, project_id=sdoc.project_id, user_id=SYSTEM_USER_ID, sdoc_id=sdoc.id
    )
    spans = []
    for word in words:
        begin = data.content.index(word)
        token = data.token_starts.index(begin)
        spans.append(
            SpanAnnotationCreateIntern(
                uuid=str(uuid4()),
                begin_token=token,
                end_token=token + 1,
                begin=begin,
                end=begin + len(word),
                span_text=word,
                code_id=code_id,
                annotation_document_id=adoc.id,
            )
        )
    SpanGroupService().replace_groups(
        db=db,
        project_id=sdoc.project_id,
        annotation_document_id=adoc.id,
        name="coref",
        code_ids=[code_id],
        groups=[spans],
    )


@pytest.fixture(scope="function")
def coref_project(db_session: Session, test_user: UserORM) -> CorefProject:
    project = create_project_with_features(
        db_session, test_user, title="Coref Project", features=[]
    )
    german_text = _create_sdoc(
        db_session,
        project,
        name="german.txt",
        doctype=DocType.text,
        sentences=GERMAN_SENTENCES,
        language="de",
    )
    english_text = _create_sdoc(
        db_session,
        project,
        name="english.txt",
        doctype=DocType.text,
        sentences=ENGLISH_SENTENCES,
        language="en",
    )
    german_image = _create_sdoc(
        db_session,
        project,
        name="german.png",
        doctype=DocType.image,
        sentences=GERMAN_SENTENCES,
        language="de",
    )
    ArtefactService().set_up(
        db=db_session,
        project_id=project.id,
        artefacts=frozenset({artefact_named("coreferences")}),
    )
    mention = crud_code.read_by_name_and_project(
        db=db_session, code_name="MENTION", project_id=project.id
    )
    assert mention is not None
    formerly_german = _create_sdoc(
        db_session,
        project,
        name="formerly_german.txt",
        doctype=DocType.text,
        sentences=ENGLISH_SENTENCES,
        language="en",
    )
    set_step_status(db_session, formerly_german.id, {"coreference_resolution": 1})
    _store_earlier_mentions(db_session, formerly_german, mention.id, ["Anna", "She"])
    db_session.commit()
    for obj in (project, german_text, english_text, german_image, formerly_german):
        db_session.refresh(obj)
    return {
        "project": project,
        "mention": mention,
        "german_text": german_text,
        "english_text": english_text,
        "german_image": german_image,
        "formerly_german": formerly_german,
    }


@pytest.fixture(scope="function")
def codeless_project(db_session: Session, test_user: UserORM) -> ProjectORM:
    """The project "Codeless Project" of `test_user`, without any enabled
    feature, documents or codes (no feature that declares codes is enabled)."""
    return create_project_with_features(
        db_session, test_user, title="Codeless Project", features=[]
    )
