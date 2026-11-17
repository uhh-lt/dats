"""The artefact `html`, every document's HTML mapped to its tokens, carried by a
column of the document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

HTML = artefact("html", kind=StorageKind.DOCUMENT_DATA, always=True)
