"""The artefact `raw_html`, every document's text as HTML, carried by a column
of the document's data row."""

from systems.artefact_system.artefact_registry import artefact

RAW_HTML = artefact("raw_html", always=True)
