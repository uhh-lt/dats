from typing import TypedDict
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_orm import ProjectORM
from core.user.user_crud import SYSTEM_USER_ID
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import create_project_with_features
from pipeline_test_utils import core_steps, set_step_status

# the text of the documents of `QuotationProject`; tokens are split at
# whitespace: Anna(0) sagte,(1) sie(2) komme(3) morgen.(4) Das(5) Wetter(6)
# bleibt(7) schön.(8)
QUOTATION_SENTENCES = ["Anna sagte, sie komme morgen.", "Das Wetter bleibt schön."]


class QuotationProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Quotation Project" of `test_user`, with quotation detection
      enabled (and nothing else)
    - five documents; the core steps of their doctype are finished,
      quotation_detection is processing (planned, its job not started yet):
      - german: text document "german.txt" with the text of
        `QUOTATION_SENTENCES`, language "de"
      - english: text document "english.txt" with the text of
        `QUOTATION_SENTENCES`, language "en"
      - was_german: text document "was_german.txt" with the text of
        `QUOTATION_SENTENCES`, language "en"; the system user has one span group
        "quote" in it with one span annotation DIRECT over "Anna", as if the
        step ran while its language was "de"
      - german_image: image document "german_image.png" with an empty caption
        (no tokens, no sentences), language "de"
      - german_audio: audio document "german_audio.mp3" whose transcript is the
        text of `QUOTATION_SENTENCES`, language "de"; its first sentence ends
        one character before the end of the token "morgen." (as when spaCy
        splits a sentence inside a whisper word)

    Non-obvious derived behavior:

    - The project has the quotation codes (QUOTATIONS and its nine
      descendants) as system codes.
    - Only german is a German text document: the step calls the quotation model
      for it alone, the others finish without quotations.
    - The token data of german_image and german_audio cannot be turned into the
      input of the quotation model: the sentence ids of the tokens need a
      sentence, the token of a sentence boundary must exist.
    """

    project: ProjectORM
    german: SourceDocumentORM
    english: SourceDocumentORM
    was_german: SourceDocumentORM
    german_image: SourceDocumentORM
    german_audio: SourceDocumentORM


def _create_document(
    db: Session,
    project: ProjectORM,
    *,
    name: str,
    doctype: DocType,
    language: str,
    sentences: list[str],
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
    set_step_status(
        db,
        sdoc.id,
        {**dict.fromkeys(core_steps(doctype), 1), "quotation_detection": 0},
    )
    return sdoc


@pytest.fixture(scope="function")
def quotation_project(db_session: Session, test_user: UserORM) -> QuotationProject:
    """The project described in `QuotationProject`."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Quotation Project",
        features=["quotation_detection"],
    )
    documents = {
        key: _create_document(
            db_session,
            project,
            name=name,
            doctype=doctype,
            language=language,
            sentences=sentences,
        )
        for key, name, doctype, language, sentences in (
            ("german", "german.txt", DocType.text, "de", QUOTATION_SENTENCES),
            ("english", "english.txt", DocType.text, "en", QUOTATION_SENTENCES),
            ("was_german", "was_german.txt", DocType.text, "en", QUOTATION_SENTENCES),
            ("german_image", "german_image.png", DocType.image, "de", []),
            (
                "german_audio",
                "german_audio.mp3",
                DocType.audio,
                "de",
                QUOTATION_SENTENCES,
            ),
        )
    }

    audio_data = crud_sdoc_data.read(
        db=db_session,
        project_id=documents["german_audio"].project_id,
        id=documents["german_audio"].id,
    )
    audio_data.sentence_ends = [
        audio_data.sentence_ends[0] - 1,
        *audio_data.sentence_ends[1:],
    ]

    adoc = crud_adoc.exists_or_create(
        db=db_session,
        project_id=documents["was_german"].project_id,
        user_id=SYSTEM_USER_ID,
        sdoc_id=documents["was_german"].id,
    )
    direct = crud_code.read_by_name(
        db=db_session, code_name="DIRECT", project_id=project.id
    )
    assert direct is not None
    SpanGroupService().replace_groups(
        db=db_session,
        project_id=project.id,
        annotation_document_id=adoc.id,
        name="quote",
        code_ids=[direct.id],
        groups=[
            [
                SpanAnnotationCreateIntern(
                    uuid=str(uuid4()),
                    begin_token=0,
                    end_token=1,
                    begin=0,
                    end=4,
                    span_text="Anna",
                    code_id=direct.id,
                    annotation_document_id=adoc.id,
                )
            ]
        ],
    )

    db_session.commit()
    for obj in (project, *documents.values()):
        db_session.refresh(obj)
    return {
        "project": project,
        "german": documents["german"],
        "english": documents["english"],
        "was_german": documents["was_german"],
        "german_image": documents["german_image"],
        "german_audio": documents["german_audio"],
    }


@pytest.fixture(scope="function")
def plain_project(db_session: Session, test_user: UserORM) -> ProjectORM:
    """The project "Plain Project" of `test_user`, without any enabled feature,
    documents or codes (no feature that declares codes is enabled)."""
    return create_project_with_features(
        db_session, test_user, title="Plain Project", features=[]
    )
