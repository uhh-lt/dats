"""The artefact `transcript` of audio and video documents: their content, raw
HTML, tokens and token times, carried by the columns of the document's data
row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

TRANSCRIPT = artefact("transcript", kind=StorageKind.DOCUMENT_DATA, always=True)
