"""split spacy steps and add document embedding step

The spaCy outputs become steps of their own: text_keywords, text_word_frequency
and text_ner get status columns, text_spacy now stands for tokens and sentences
only. As the old text_spacy step wrote all four outputs, the new columns copy
its status.

Document embeddings become the pipeline step text_document_embedding. It is
finished where the removed ML job DOCUMENT_EMBEDDING finished for the document
(sourcedocumentjobstatus type 102, status 3), and not planned (NULL) otherwise.
The rows of the removed ML jobs DOCUMENT_EMBEDDING (102) and SENTENCE_EMBEDDING
(103) are deleted; sentence embeddings are the step text_sentence_embedding.

The computed columns processed_jobs, total_jobs and processed_status are
recreated over the new column list. The upgrade checks that no document changes
its processed_status and fails (rolling back the migration) otherwise.

The downgrade restores the DOCUMENT_EMBEDDING rows from text_document_embedding;
the SENTENCE_EMBEDDING rows cannot be restored.

Revision ID: f2811eafb060
Revises: 448579029394
Create Date: 2026-11-10 13:03:59.120276

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2811eafb060"
down_revision: str | None = "448579029394"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Snapshot of the step status columns before this revision, in table order.
OLD_STATUS_COLUMNS = [
    "extract_html",
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
    "image_caption",
    "image_embedding",
    "image_metadata_extraction",
    "image_thumbnail",
    "image_object_detection",
    "audio_metadata",
    "audio_thumbnail",
    "audio_transcription",
    "video_metadata",
    "video_thumbnail",
    "video_audio_extraction",
]
SPACY_STEP_COLUMNS = ["text_keywords", "text_word_frequency", "text_ner"]
DOCUMENT_EMBEDDING_COLUMN = "text_document_embedding"
NEW_COLUMNS = [*SPACY_STEP_COLUMNS, DOCUMENT_EMBEDDING_COLUMN]
STATUS_COLUMNS = [*OLD_STATUS_COLUMNS, *NEW_COLUMNS]

# sourcedocumentjobstatus.type of the removed ML jobs, and its finished status
ML_DOCUMENT_EMBEDDING = 102
ML_SENTENCE_EMBEDDING = 103
ML_FINISHED = 3


def _processed_jobs_sql(columns: list[str]) -> str:
    return " + ".join(f"(CASE WHEN {c} = 1 THEN 1 ELSE 0 END)" for c in columns)


def _total_jobs_sql(columns: list[str]) -> str:
    return " + ".join(f"(CASE WHEN {c} IS NULL THEN 0 ELSE 1 END)" for c in columns)


def _processed_status_sql(columns: list[str]) -> str:
    all_columns = ", ".join(columns)
    return (
        f"CASE WHEN -100 IN ({all_columns}) THEN -100 "
        f"WHEN 0 IN ({all_columns}) THEN 0 ELSE 1 END"
    )


def _drop_computed() -> None:
    op.drop_index(
        op.f("ix_sourcedocument_processed_status"), table_name="sourcedocument"
    )
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    op.drop_column("sourcedocument", "processed_status")
    op.drop_column("sourcedocument", "total_jobs")
    op.drop_column("sourcedocument", "processed_jobs")


def _add_computed(columns: list[str]) -> None:
    for name, sql in (
        ("processed_jobs", _processed_jobs_sql(columns)),
        ("total_jobs", _total_jobs_sql(columns)),
        ("processed_status", _processed_status_sql(columns)),
    ):
        op.add_column(
            "sourcedocument",
            sa.Column(
                name, sa.Integer(), sa.Computed(sql, persisted=True), nullable=False
            ),
        )
    op.create_index(
        op.f("ix_sourcedocument_processed_jobs"),
        "sourcedocument",
        ["processed_jobs"],
        unique=False,
    )
    op.create_index(
        op.f("ix_sourcedocument_processed_status"),
        "sourcedocument",
        ["processed_status"],
        unique=False,
    )


def _migrate_step_status() -> None:
    """Fill the new step columns and delete the rows of the removed ML jobs."""
    conn = op.get_bind()
    # the old text_spacy step wrote keywords, word frequencies and named entities
    conn.execute(
        sa.text(
            "UPDATE sourcedocument SET "
            + ", ".join(f"{c} = text_spacy" for c in SPACY_STEP_COLUMNS)
        )
    )
    conn.execute(
        sa.text(
            f"UPDATE sourcedocument s SET {DOCUMENT_EMBEDDING_COLUMN} = 1 "
            "FROM sourcedocumentjobstatus j "
            "WHERE j.id = s.id AND j.type = :type AND j.status = :finished"
        ),
        {"type": ML_DOCUMENT_EMBEDDING, "finished": ML_FINISHED},
    )
    conn.execute(
        sa.text("DELETE FROM sourcedocumentjobstatus WHERE type IN (:doc, :sent)"),
        {"doc": ML_DOCUMENT_EMBEDDING, "sent": ML_SENTENCE_EMBEDDING},
    )


def upgrade() -> None:
    conn = op.get_bind()

    # remember the current status to check it is unchanged at the end
    conn.execute(
        sa.text(
            "CREATE TEMPORARY TABLE old_sdoc_status ON COMMIT DROP AS "
            "SELECT id, processed_status AS status FROM sourcedocument"
        )
    )

    # the computed columns reference the status columns, so they are recreated
    _drop_computed()
    for column in NEW_COLUMNS:
        op.add_column("sourcedocument", sa.Column(column, sa.Integer(), nullable=True))
    _migrate_step_status()
    _add_computed(STATUS_COLUMNS)

    changed = conn.execute(
        sa.text(
            "SELECT count(*) FROM sourcedocument s JOIN old_sdoc_status o "
            "ON s.id = o.id WHERE s.processed_status <> o.status"
        )
    ).scalar_one()
    if changed > 0:
        raise RuntimeError(
            f"Migration would change the processed_status of {changed} documents."
        )
    conn.execute(sa.text("DROP TABLE old_sdoc_status"))


def downgrade() -> None:
    conn = op.get_bind()

    # the ML job DOCUMENT_EMBEDDING finished where the step finished
    conn.execute(
        sa.text(
            "INSERT INTO sourcedocumentjobstatus (id, type, status, timestamp) "
            "SELECT id, :type, :finished, now() FROM sourcedocument "
            f"WHERE {DOCUMENT_EMBEDDING_COLUMN} = 1 "
            "ON CONFLICT (id, type) DO NOTHING"
        ),
        {"type": ML_DOCUMENT_EMBEDDING, "finished": ML_FINISHED},
    )

    _drop_computed()
    for column in reversed(NEW_COLUMNS):
        op.drop_column("sourcedocument", column)
    _add_computed(OLD_STATUS_COLUMNS)
