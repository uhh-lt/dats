"""The stores of the artefacts in the core entities: the document data columns
(`DocumentData`), the metadata values (`MetadataValue`) and the annotations of
the system user (`SystemSpans`); each reads and writes only what its artefact
owns."""

from uuid import uuid4

import pytest
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreateIntern
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.user.user_crud import SYSTEM_USER_ID
from pipeline_test_utils import artefact_named
from systems.artefact_system.artefact_exceptions import ForeignArtefactDataError

from .conftest import ArtefactStoreProject


def _span(
    fixture: ArtefactStoreProject, adoc_id: int, code_id: int
) -> SpanAnnotationCreateIntern:
    """A span on "Anna" (characters 0-4, token 0)."""
    return SpanAnnotationCreateIntern(
        project_id=fixture["project_id"],
        uuid=str(uuid4()),
        begin=0,
        end=4,
        begin_token=0,
        end_token=1,
        span_text="Anna",
        code_id=code_id,
        annotation_document_id=adoc_id,
    )


def _system_span_ids(db: Session, sdoc_id: int) -> list[int]:
    return [
        span.id
        for span in crud_span_anno.read_by_user_and_sdoc(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=sdoc_id
        )
    ]


# ===========================================================================
# DOCUMENT DATA
# ===========================================================================


def test_document_data_writes_the_columns_of_its_artefact(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """The store of `html` writes the column html."""
    sdoc_id = artefact_store_project["sdoc_id"]
    store = artefact_named("html").store

    store.write(
        db=db_session,
        sdoc_id=sdoc_id,
        update=SourceDocumentDataUpdate(html="<p>new</p>"),
    )

    assert store.read(db=db_session, sdoc_id=sdoc_id).html == "<p>new</p>"


def test_document_data_rejects_a_column_of_another_artefact(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """The store of `content` refuses to write the column html, which belongs to
    the artefact `html`."""
    with pytest.raises(ForeignArtefactDataError, match="document data column 'html'"):
        artefact_named("content").store.write(
            db=db_session,
            sdoc_id=artefact_store_project["sdoc_id"],
            update=SourceDocumentDataUpdate(content="new", html="<p>new</p>"),
        )


def test_document_data_read_many_loads_the_columns_of_its_artefact(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """A batch read of the tokens and sentences loads their offsets only, not
    the content or the HTML; documents without data have no entry."""
    db_session.expunge_all()
    sdoc_id = artefact_store_project["sdoc_id"]

    data = artefact_named("tokens_sentences").store.read_many(
        db=db_session, sdoc_ids=[sdoc_id, -1]
    )

    assert list(data) == [sdoc_id]
    unloaded = inspect(data[sdoc_id]).unloaded
    assert {"content", "html", "raw_html"} <= unloaded
    assert not {"token_starts", "sentence_starts"} & unloaded


def test_document_data_read_many_loads_the_columns_of_other_stores_too(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """A batch read of the tokens and sentences with the store of the content
    loads the content too, so the tokens are read without another query."""
    db_session.expunge_all()
    sdoc_id = artefact_store_project["sdoc_id"]

    data = artefact_named("tokens_sentences").store.read_many(
        db=db_session,
        sdoc_ids=[sdoc_id],
        with_stores=[artefact_named("content").store],
    )

    unloaded = inspect(data[sdoc_id]).unloaded
    assert "content" not in unloaded and "html" in unloaded
    assert data[sdoc_id].tokens == ["Anna", "sleeps."]


# ===========================================================================
# METADATA VALUE
# ===========================================================================


def test_metadata_value_writes_and_reads_its_key(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """The store of `language` writes and reads the value of the key language;
    read by project, it returns the value of every document."""
    store = artefact_named("language").store
    sdoc_id = artefact_store_project["sdoc_id"]

    store.write(
        db=db_session,
        project_id=artefact_store_project["project_id"],
        sdoc_id=sdoc_id,
        doctype=DocType.text,
        values={"language": "de"},
    )

    assert store.read(db=db_session, sdoc_id=sdoc_id).str_value == "de"
    by_project = store.read_by_project(
        db=db_session, project_id=artefact_store_project["project_id"]
    )
    assert {m.source_document_id: m.str_value for m in by_project} == {
        sdoc_id: "de",
        artefact_store_project["other_sdoc_id"]: "en",
    }


def test_metadata_value_rejects_a_key_of_another_artefact(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """The store of `language` refuses to write the key caption, which belongs
    to the artefact `image_caption`."""
    with pytest.raises(ForeignArtefactDataError, match="metadata key 'caption'"):
        artefact_named("language").store.write(
            db=db_session,
            project_id=artefact_store_project["project_id"],
            sdoc_id=artefact_store_project["sdoc_id"],
            doctype=DocType.text,
            values={"caption": "A cat"},
        )


# ===========================================================================
# SYSTEM ANNOTATIONS
# ===========================================================================


def test_system_spans_replace_keeps_the_spans_of_the_users(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """Replacing the named entities twice leaves the system user the spans of
    the second run, and the user's PERSON span on "Anna" stays."""
    fixture = artefact_store_project
    store = artefact_named("ner_spans").store
    adoc_id = store.annotation_document_id(db=db_session, sdoc_id=fixture["sdoc_id"])
    for _ in range(2):
        store.replace(
            db=db_session,
            project_id=fixture["project_id"],
            sdoc_id=fixture["sdoc_id"],
            spans=[_span(fixture, adoc_id, fixture["person_code_id"])],
        )

    assert len(_system_span_ids(db_session, fixture["sdoc_id"])) == 1
    assert crud_span_anno.read(db=db_session, id=fixture["user_span_id"])


def test_system_spans_reject_a_code_of_another_artefact(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """The store of `ner_spans` refuses a span whose code is none of its named
    entity codes (an unknown code id)."""
    fixture = artefact_store_project
    store = artefact_named("ner_spans").store
    adoc_id = store.annotation_document_id(db=db_session, sdoc_id=fixture["sdoc_id"])
    with pytest.raises(ForeignArtefactDataError, match="span annotation"):
        store.replace(
            db=db_session,
            project_id=fixture["project_id"],
            sdoc_id=fixture["sdoc_id"],
            spans=[_span(fixture, adoc_id, -1)],
        )


def test_system_spans_clear_creates_no_annotation_document(
    db_session: Session, artefact_store_project: ArtefactStoreProject
):
    """Clearing the spans of a document the system user never annotated
    creates no annotation document of the system user."""
    fixture = artefact_store_project

    artefact_named("ner_spans").store.clear(
        db=db_session,
        project_id=fixture["project_id"],
        sdoc_id=fixture["other_sdoc_id"],
    )

    assert not crud_adoc.read_by_user_and_sdocs(
        db=db_session, user_id=SYSTEM_USER_ID, sdoc_ids=[fixture["other_sdoc_id"]]
    )
