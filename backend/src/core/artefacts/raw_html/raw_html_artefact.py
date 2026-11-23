"""The artefact `raw_html`, every document's text as HTML, in a column of the
document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.document_data_store import DocumentData

RAW_HTML = artefact(
    "raw_html", title="Raw HTML", always=True, store=DocumentData("raw_html")
)
