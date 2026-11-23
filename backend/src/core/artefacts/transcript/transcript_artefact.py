"""The artefact `transcript` of audio and video documents: the transcribed words,
their character offsets in the content and their times in the audio, in columns
of the document's data row. The transcription step writes the text as raw HTML,
from which the step `text_extraction` writes the content."""

from systems.artefact_system.artefact_registry import artefact
from systems.artefact_system.stores.document_data_store import DocumentData

TRANSCRIPT = artefact(
    "transcript",
    title="Transcript",
    always=True,
    store=DocumentData(
        "transcript_word_starts",
        "transcript_word_ends",
        "transcript_word_time_starts",
        "transcript_word_time_ends",
    ),
)
