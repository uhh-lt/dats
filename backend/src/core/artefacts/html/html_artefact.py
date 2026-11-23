"""The artefact `html`, every document's HTML mapped to its tokens, in a column of the
document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.document_data_store import DocumentData

HTML = artefact("html", title="Display HTML", always=True, store=DocumentData("html"))
