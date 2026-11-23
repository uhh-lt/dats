"""The artefact `tokens_sentences`, every document's tokens and sentences,
in columns of the document's data row: character offsets in its content."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.document_data_store import DocumentData

TOKENS_SENTENCES = artefact(
    "tokens_sentences",
    title="Tokens and sentences",
    always=True,
    store=DocumentData(
        "token_starts", "token_ends", "sentence_starts", "sentence_ends"
    ),
)
