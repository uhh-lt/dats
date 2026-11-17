"""The artefact `content`, every document's plain text, carried by a column of
the document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

CONTENT = artefact("content", kind=StorageKind.DOCUMENT_DATA, always=True)
