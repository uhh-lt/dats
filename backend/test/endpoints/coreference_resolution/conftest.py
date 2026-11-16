from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import (
    create_project_with_features,
    minimal_image_steps,
    minimal_text_steps,
)
from pipeline_test_utils import set_step_status

# the German text of german_text and german_image; whitespace tokens:
# 0 "Anna", 1 "liest", 2 "ein", 3 "Buch.", 4 "Sie", 5 "mag", 6 "es", 7 "sehr."
GERMAN_SENTENCES = ["Anna liest ein Buch.", "Sie mag es sehr."]
ENGLISH_SENTENCES = ["Anna reads a book.", "She likes it a lot."]


class CorefProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Coref Project" of `test_user`, without any enabled feature; it
      has the system code MENTION (project creation creates it until the
      coreference artefact is the only one to declare it)
    - mention: the code MENTION of the project
    - german_text: text document "german.txt" with the text of
      `GERMAN_SENTENCES` ("Anna liest ein Buch." and "Sie mag es sehr.") and the
      language "de"
    - english_text: text document "english.txt" with the text of
      `ENGLISH_SENTENCES` and the language "en"
    - german_image: image document "german.png" whose caption is the text of
      `GERMAN_SENTENCES`, with the language "de"; it has no image file
    The steps of a project without features are finished for every document,
    all other steps are not planned. No document has annotations.

    Non-obvious derived behavior:

    - The tokens are the whitespace-separated words, so a token of a sentence
      end includes its period ("Buch.").
    - The coreference step follows text_spacy, which runs for every doctype, so
      it is planned for the image too, where it finishes without output.
    """

    project: ProjectORM
    mention: CodeORM
    german_text: SourceDocumentORM
    english_text: SourceDocumentORM
    german_image: SourceDocumentORM


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
        db=db, sdoc_id=sdoc.id, key="language"
    ).str_value = language
    steps = minimal_text_steps() if doctype == DocType.text else minimal_image_steps()
    set_step_status(db, sdoc.id, dict.fromkeys(steps, 1))
    return sdoc


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
    db_session.commit()
    mention = crud_code.read_by_name_and_project(
        db=db_session, code_name="MENTION", project_id=project.id
    )
    assert mention is not None
    for obj in (project, german_text, english_text, german_image):
        db_session.refresh(obj)
    return {
        "project": project,
        "mention": mention,
        "german_text": german_text,
        "english_text": english_text,
        "german_image": german_image,
    }
