"""The stored text a text step reads: the steps that compute from the text and
its language (spaCy, keywords, word frequencies, named entities) build their
input from it in their enrichers."""

from typing import NamedTuple

from common.doc_type_enum import DocType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from repos.db.sql_repo import SQLRepo

sqlr = SQLRepo()


class StoredText(NamedTuple):
    doctype: DocType
    text: str
    raw_html: str
    language: str


def read_stored_text(project_id: int, sdoc_id: int) -> StoredText:
    """The text, raw HTML, doctype and detected language of the document."""
    with sqlr.transaction() as db:
        sdoc_data = crud_sdoc_data.read(db=db, project_id=project_id, id=sdoc_id)
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, key="language", sdoc_id=sdoc_id
        )
        assert language.str_value is not None, (
            "The language must be detected before the text steps run!"
        )
        return StoredText(
            doctype=DocType(sdoc_data.source_document.doctype),
            text=sdoc_data.content,
            raw_html=sdoc_data.raw_html,
            language=language.str_value,
        )
