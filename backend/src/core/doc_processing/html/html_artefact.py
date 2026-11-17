"""The artefact `html`, every document's HTML mapped to its tokens, carried by a
column of the document's data row."""

from systems.artefact_system.artefact_registry import artefact

HTML = artefact("html", always=True)
