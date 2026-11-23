"""The artefact `content`, every document's plain text, in a column of the
document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.document_data_store import DocumentData

CONTENT = artefact(
    "content", title="Text content", always=True, store=DocumentData("content")
)
