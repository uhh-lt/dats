"""The artefact `language`, every document's language, carried by the metadata
key "language"."""

from systems.artefact_system.artefact_registry import artefact

LANGUAGE = artefact("language", always=True)
