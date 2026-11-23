"""The stored text a text step reads: the steps that compute from the text and
its language (spaCy, keywords, word frequencies, named entities) build their
input from it in their enrichers."""

from typing import NamedTuple

from common.doc_type_enum import DocType
from core.artefacts.content.content_artefact import CONTENT
from core.artefacts.language.language_artefact import LANGUAGE
from core.artefacts.raw_html.raw_html_artefact import RAW_HTML
from repos.db.sql_repo import SQLRepo

sqlr = SQLRepo()


class StoredText(NamedTuple):
    doctype: DocType
    text: str
    raw_html: str
    language: str


def read_stored_text(sdoc_id: int) -> StoredText:
    """The text, raw HTML, doctype and detected language of the document."""
    with sqlr.transaction() as db:
        sdoc_data = CONTENT.store.read(db=db, sdoc_id=sdoc_id)
        raw_html = RAW_HTML.store.read(db=db, sdoc_id=sdoc_id).raw_html
        language = LANGUAGE.store.read(db=db, sdoc_id=sdoc_id)
        assert language.str_value is not None, (
            "The language must be detected before the text steps run!"
        )
        return StoredText(
            doctype=DocType(sdoc_data.source_document.doctype),
            text=sdoc_data.content,
            raw_html=raw_html,
            language=language.str_value,
        )
