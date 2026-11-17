"""The artefact `content`, every document's plain text, carried by a column of
the document's data row."""

from systems.artefact_system.artefact_registry import artefact

CONTENT = artefact("content", title="Text content", always=True)
