"""The artefact `tokens_sentences`, every document's tokens and sentences,
carried by the columns of the document's data row."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.artefact_system_enum import StorageKind

TOKENS_SENTENCES = artefact(
    "tokens_sentences", kind=StorageKind.DOCUMENT_DATA, always=True
)
