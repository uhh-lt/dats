"""The artefact `language`, every document's language, carried by the metadata
key "language"."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

LANGUAGE = artefact("language", kind=StorageKind.METADATA, always=True)
