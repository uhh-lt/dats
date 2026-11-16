from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
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

# the text of every document of `QuotationProject`; tokens are split at
# whitespace: Anna(0) sagte,(1) sie(2) komme(3) morgen.(4) Das(5) Wetter(6)
# bleibt(7) schön.(8)
QUOTATION_SENTENCES = ["Anna sagte, sie komme morgen.", "Das Wetter bleibt schön."]


class QuotationProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Quotation Project" of `test_user`, with quotation detection
      enabled (and nothing else)
    - three documents with the text of `QUOTATION_SENTENCES`; the steps of a
      project without features are finished, quotation_detection is processing
      (planned, its job not started yet):
      - german: text document "german.txt", language "de"
      - english: text document "english.txt", language "en"
      - german_image: image document "german_image.png" whose caption is the
        text, language "de"

    Non-obvious derived behavior:

    - The project has the quotation codes (QUOTATIONS and its nine
      descendants) as system codes.
    - Only german is a German text document: the step calls the quotation model
      for it alone, the other two finish without quotations.
    """

    project: ProjectORM
    german: SourceDocumentORM
    english: SourceDocumentORM
    german_image: SourceDocumentORM


def _create_document(
    db: Session,
    project: ProjectORM,
    *,
    name: str,
    doctype: DocType,
    language: str,
    core_steps: list[str],
) -> SourceDocumentORM:
    sdoc = create_text_document(
        db,
        project=project,
        filename=name,
        name=name,
        sentences=QUOTATION_SENTENCES,
        doctype=doctype,
    )
    crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc.id, key="language"
    ).str_value = language
    set_step_status(
        db, sdoc.id, {**dict.fromkeys(core_steps, 1), "quotation_detection": 0}
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
            core_steps=core_steps,
        )
        for key, name, doctype, language, core_steps in (
            ("german", "german.txt", DocType.text, "de", minimal_text_steps()),
            ("english", "english.txt", DocType.text, "en", minimal_text_steps()),
            (
                "german_image",
                "german_image.png",
                DocType.image,
                "de",
                minimal_image_steps(),
            ),
        )
    }
    db_session.commit()
    for obj in (project, *documents.values()):
        db_session.refresh(obj)
    return {
        "project": project,
        "german": documents["german"],
        "english": documents["english"],
        "german_image": documents["german_image"],
    }


@pytest.fixture(scope="function")
def plain_project(db_session: Session, test_user: UserORM) -> ProjectORM:
    """The project "Plain Project" of `test_user`, without any enabled feature
    and without documents. It has the quotation codes all the same: until the
    codes move into the module, every new project gets them."""
    return create_project_with_features(
        db_session, test_user, title="Plain Project", features=[]
    )
