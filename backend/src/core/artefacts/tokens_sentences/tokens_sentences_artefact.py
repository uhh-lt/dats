"""The artefact `tokens_sentences`, every document's tokens and sentences,
carried by the columns of the document's data row."""

from systems.artefact_system.artefact_registry import artefact

TOKENS_SENTENCES = artefact("tokens_sentences", always=True)
