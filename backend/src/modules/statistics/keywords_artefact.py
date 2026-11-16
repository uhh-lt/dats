"""The keywords of a document, carried by its metadata key "keywords"."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

KEYWORDS = artefact("keywords", kind=StorageKind.METADATA)
