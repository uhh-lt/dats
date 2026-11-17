"""rename the pipeline steps

A step is named like its job file: no `text_` prefix (those steps run for every
doctype) and a doctype prefix only where there is one step per doctype. The
step status rows of `sourcedocumentstepstatus` get the new names in one
UPDATE; no new name was a step name before, so no row collides. The downgrade
renames them back. No other table stores step names (the project stores
features and artefacts).

Revision ID: 10b8dac1fdd6
Revises: a7b1a760a827
Create Date: 2026-11-17 16:59:05.313148

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "10b8dac1fdd6"
down_revision: str | None = "a7b1a760a827"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "sourcedocumentstepstatus"

# Snapshot of the renamed steps, old name -> new name.
RENAMED_STEPS = {
    "extract_html": "html_extraction",
    "text_language_detection": "language_detection",
    "text_spacy": "tokens_sentences",
    "text_html_mapping": "html_mapping",
    "text_es_index": "es_index",
    "text_word_frequency": "word_frequency",
    "text_sentence_embedding": "sentence_embedding",
    "text_keywords": "keywords",
    "text_ner": "named_entity_recognition",
    "text_document_embedding": "document_embedding",
    "image_object_detection": "object_detection",
    "audio_transcription": "transcription",
    "audio_metadata": "audio_metadata_extraction",
    "video_metadata": "video_metadata_extraction",
}


def _rename(names: dict[str, str]) -> None:
    """Rename the steps of the status rows in one pass."""
    params: dict[str, str] = {}
    cases: list[str] = []
    for i, (old, new) in enumerate(names.items()):
        params[f"old{i}"] = old
        params[f"new{i}"] = new
        cases.append(f"WHEN :old{i} THEN :new{i}")
    olds = ", ".join(f":old{i}" for i in range(len(names)))
    op.get_bind().execute(
        sa.text(
            f"UPDATE {TABLE} SET step = CASE step {' '.join(cases)} END "
            f"WHERE step IN ({olds})"
        ),
        params,
    )


def upgrade() -> None:
    _rename(RENAMED_STEPS)


def downgrade() -> None:
    _rename({new: old for old, new in RENAMED_STEPS.items()})
