"""the transcript owns its words

The artefact `transcript` gets its own word offsets next to its word times, so
the transcription step no longer writes the token columns of the artefact
`tokens_sentences`. The word offsets of the existing audio and video documents
with a transcript are their token offsets (the tokens are the transcript's
words); the word times are the token times, renamed. The downgrade renames the
times back and drops the word offsets.

Revision ID: fd0c18fab079
Revises: 807bab97f373
Create Date: 2026-11-23 11:01:42.480805

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "fd0c18fab079"
down_revision: str | None = "807bab97f373"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "sourcedocumentdata"


def upgrade() -> None:
    op.add_column(
        TABLE,
        sa.Column(
            "transcript_word_starts", postgresql.ARRAY(sa.Integer()), nullable=True
        ),
    )
    op.add_column(
        TABLE,
        sa.Column(
            "transcript_word_ends", postgresql.ARRAY(sa.Integer()), nullable=True
        ),
    )
    op.get_bind().execute(
        sa.text(
            f"UPDATE {TABLE} AS d "
            "SET transcript_word_starts = d.token_starts, "
            "transcript_word_ends = d.token_ends "
            "FROM sourcedocument AS s "
            "WHERE s.id = d.id AND s.doctype IN ('audio', 'video') "
            "AND d.token_time_starts IS NOT NULL"
        )
    )
    op.alter_column(
        TABLE, "token_time_starts", new_column_name="transcript_word_time_starts"
    )
    op.alter_column(
        TABLE, "token_time_ends", new_column_name="transcript_word_time_ends"
    )


def downgrade() -> None:
    op.alter_column(
        TABLE, "transcript_word_time_ends", new_column_name="token_time_ends"
    )
    op.alter_column(
        TABLE, "transcript_word_time_starts", new_column_name="token_time_starts"
    )
    op.drop_column(TABLE, "transcript_word_ends")
    op.drop_column(TABLE, "transcript_word_starts")
