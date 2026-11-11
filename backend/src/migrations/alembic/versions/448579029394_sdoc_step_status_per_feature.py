"""sdoc step status per feature

The step status columns of sourcedocument become nullable with default NULL
(= step not planned). Every column that is not a step of the document's doctype
is set to NULL.

The spaCy outputs become steps of their own: text_keywords, text_word_frequency
and text_ner get status columns, text_spacy now stands for tokens and sentences
only. As the old text_spacy step wrote all four outputs, the new columns copy
its status.

Document embeddings become the pipeline step text_document_embedding. It is
finished where the removed ML job DOCUMENT_EMBEDDING finished for the document
(sourcedocumentjobstatus type 102, status 3), and not planned (NULL) otherwise.
The rows of the removed ML jobs DOCUMENT_EMBEDDING (102) and SENTENCE_EMBEDDING
(103) are deleted; sentence embeddings are the step text_sentence_embedding.

The computed column processed_jobs now counts the finished steps, and the new
computed columns total_jobs (planned steps) and processed_status (-100 if any
step is erroneous, 0 if any is processing, 1 otherwise) replace the step count
per doctype that the application used to compare against.

The table is large, so every pass over it counts: the schema changes that only
touch the catalog run as one ALTER TABLE, all status columns are set in one
UPDATE, and the three computed columns are added in one ALTER TABLE (one table
rewrite).

The upgrade checks that no document changes its processed_status and fails
(rolling back the migration) otherwise. The downgrade restores the
DOCUMENT_EMBEDDING rows from text_document_embedding; the SENTENCE_EMBEDDING
rows cannot be restored.

Revision ID: 448579029394
Revises: d7f4aa3e7395
Create Date: 2026-11-10 12:41:33.287764

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "448579029394"
down_revision: str | None = "d7f4aa3e7395"
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

# Snapshot of the pipeline steps per doctype before this revision.
_HTML_STEPS = [
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_es_index",
    "text_sentence_embedding",
    "text_html_mapping",
]
STEPS_BY_DOCTYPE = {
    "text": ["extract_html", *_HTML_STEPS],
    "image": [
        "image_caption",
        "image_embedding",
        "image_metadata_extraction",
        "image_thumbnail",
        "image_object_detection",
        *_HTML_STEPS,
    ],
    "audio": ["audio_metadata", "audio_thumbnail", "audio_transcription", *_HTML_STEPS],
    "video": [
        "video_metadata",
        "video_thumbnail",
        "video_audio_extraction",
        "audio_transcription",
        *_HTML_STEPS,
    ],
}

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


# the processed_status of the application before this revision
OLD_PROCESSED_STATUS_SQL = (
    "CASE WHEN processed_jobs < 0 THEN -100 "
    + " ".join(
        f"WHEN doctype = '{doctype}' AND processed_jobs = {len(steps)} THEN 1"
        for doctype, steps in STEPS_BY_DOCTYPE.items()
    )
    + " ELSE 0 END"
)


def _doctypes_sql(column: str) -> str:
    """The doctypes that have the step, as an SQL list."""
    return ", ".join(
        f"'{d}'" for d, steps in STEPS_BY_DOCTYPE.items() if column in steps
    )


def _step_status_sql() -> str:
    """The SET clause of the upgrade: a step that is not part of the document's
    doctype is not planned; the spaCy steps copy text_spacy (the old step wrote
    all of them); the document embedding is finished where its ML job finished."""
    assignments = [
        f"{c} = CASE WHEN doctype IN ({_doctypes_sql(c)}) THEN {c} END"
        for c in OLD_STATUS_COLUMNS
    ]
    # every doctype has the text steps, so text_spacy keeps its value
    assignments += [f"{c} = text_spacy" for c in SPACY_STEP_COLUMNS]
    assignments.append(
        f"{DOCUMENT_EMBEDDING_COLUMN} = CASE WHEN id IN ("
        "SELECT id FROM sourcedocumentjobstatus "
        f"WHERE type = {ML_DOCUMENT_EMBEDDING} AND status = {ML_FINISHED}"
        ") THEN 1 END"
    )
    return ", ".join(assignments)


def _add_computed_sql(columns: list[str]) -> list[str]:
    """ALTER TABLE subcommands that add the computed columns over these status
    columns."""
    return [
        f"ADD COLUMN {name} integer GENERATED ALWAYS AS ({sql}) STORED NOT NULL"
        for name, sql in (
            ("processed_jobs", _processed_jobs_sql(columns)),
            ("total_jobs", _total_jobs_sql(columns)),
            ("processed_status", _processed_status_sql(columns)),
        )
    ]


def _create_indexes(*, with_status: bool) -> None:
    op.create_index(
        op.f("ix_sourcedocument_processed_jobs"),
        "sourcedocument",
        ["processed_jobs"],
        unique=False,
    )
    if with_status:
        op.create_index(
            op.f("ix_sourcedocument_processed_status"),
            "sourcedocument",
            ["processed_status"],
            unique=False,
        )


def upgrade() -> None:
    conn = op.get_bind()

    # 1) remember the current status to check it is unchanged at the end
    conn.execute(
        sa.text(
            "CREATE TEMPORARY TABLE old_sdoc_status ON COMMIT DROP AS "
            f"SELECT id, {OLD_PROCESSED_STATUS_SQL} AS status FROM sourcedocument"
        )
    )

    # 2) catalog changes only: processed_jobs references the status columns, so
    # it is recreated; the status columns become nullable without a default
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument DROP COLUMN processed_jobs, "
            + ", ".join(
                f"ALTER COLUMN {c} DROP NOT NULL, ALTER COLUMN {c} DROP DEFAULT"
                for c in OLD_STATUS_COLUMNS
            )
            + ", "
            + ", ".join(f"ADD COLUMN {c} integer" for c in NEW_COLUMNS)
        )
    )

    # 3) all step statuses in one pass
    conn.execute(sa.text(f"UPDATE sourcedocument SET {_step_status_sql()}"))
    conn.execute(
        sa.text("DELETE FROM sourcedocumentjobstatus WHERE type IN (:doc, :sent)"),
        {"doc": ML_DOCUMENT_EMBEDDING, "sent": ML_SENTENCE_EMBEDDING},
    )

    # 4) the computed columns, in one table rewrite
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument " + ", ".join(_add_computed_sql(STATUS_COLUMNS))
        )
    )
    _create_indexes(with_status=True)

    # 5) check that no document changed its status
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

    # 1) the ML job DOCUMENT_EMBEDDING finished where the step finished
    conn.execute(
        sa.text(
            "INSERT INTO sourcedocumentjobstatus (id, type, status, timestamp) "
            "SELECT id, :type, :finished, now() FROM sourcedocument "
            f"WHERE {DOCUMENT_EMBEDDING_COLUMN} = 1 "
            "ON CONFLICT (id, type) DO NOTHING"
        ),
        {"type": ML_DOCUMENT_EMBEDDING, "finished": ML_FINISHED},
    )

    # 2) catalog changes only: drop the computed and the new step columns
    op.drop_index(
        op.f("ix_sourcedocument_processed_status"), table_name="sourcedocument"
    )
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument "
            + ", ".join(
                f"DROP COLUMN {c}"
                for c in ["processed_status", "total_jobs", "processed_jobs"]
                + NEW_COLUMNS
            )
        )
    )

    # 3) a step that is not planned had the default status processing (0) before
    conn.execute(
        sa.text(
            "UPDATE sourcedocument SET "
            + ", ".join(f"{c} = coalesce({c}, 0)" for c in OLD_STATUS_COLUMNS)
        )
    )

    # 4) the old columns and processed_jobs, in one table rewrite
    old_processed_jobs = " + ".join(OLD_STATUS_COLUMNS)
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument "
            + ", ".join(
                f"ALTER COLUMN {c} SET NOT NULL, ALTER COLUMN {c} SET DEFAULT 0"
                for c in OLD_STATUS_COLUMNS
            )
            + ", ADD COLUMN processed_jobs integer "
            f"GENERATED ALWAYS AS ({old_processed_jobs}) STORED NOT NULL"
        )
    )
    _create_indexes(with_status=False)
