"""The artefact `raw_html`, every document's text as HTML, carried by a column
of the document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

RAW_HTML = artefact("raw_html", kind=StorageKind.DOCUMENT_DATA, always=True)
