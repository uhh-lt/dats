"""sdoc step status per feature

The status of the pipeline steps moves from the step columns of sourcedocument
into the new table sourcedocumentstepstatus: one row (sdoc_id, step, status) per
planned step; a step without a row is not planned. The step columns and the
computed column processed_jobs are dropped; the overall status of a document is
derived from its rows (erroneous if any step is erroneous, processing if any is
processing, finished otherwise).

Every step of the document's doctype gets a row with the status of its column;
the columns of steps the doctype does not have get none.

The spaCy outputs become steps of their own: text_keywords, text_word_frequency
and text_ner copy the status of text_spacy, which wrote all four outputs and now
stands for tokens and sentences only.

Document embeddings become the pipeline step text_document_embedding. It is
finished where the removed ML job DOCUMENT_EMBEDDING finished for the document
(sourcedocumentjobstatus type 102, status 3), and not planned otherwise. The rows
of the removed ML jobs DOCUMENT_EMBEDDING (102) and SENTENCE_EMBEDDING (103) are
deleted; sentence embeddings are the step text_sentence_embedding.

The table is large, so every pass over it counts: all rows are written by one
INSERT ... SELECT, the keys and indexes are created afterwards, and the old
columns are dropped in one ALTER TABLE that only touches the catalog.

The upgrade checks that no document changes its overall status and fails
(rolling back the migration) otherwise. The downgrade restores the columns (a
step that is not planned gets the old default, processing) and the
DOCUMENT_EMBEDDING rows from text_document_embedding; the SENTENCE_EMBEDDING
rows cannot be restored.

The project gets the column feature_activations (Feature value -> activation id)
of the feature activations still planning in the background; the downgrade drops
it.

Revision ID: 448579029394
Revises: d7f4aa3e7395
Create Date: 2026-11-10 12:41:33.287764

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "448579029394"
down_revision: str | None = "d7f4aa3e7395"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "sourcedocumentstepstatus"

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
SPACY_STEPS = ["text_keywords", "text_word_frequency", "text_ner"]
DOCUMENT_EMBEDDING_STEP = "text_document_embedding"

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


def _unpivot_sql() -> str:
    """The (step, status) pairs of a document `s`, as a VALUES list; the CASE
    yields NULL for a step the document does not get, and such a pair becomes no
    row. A step that is not part of the document's doctype is not planned; the spaCy steps copy text_spacy (the old step wrote all of them; every
    doctype has it); the document embedding is finished where its ML job `j`
    finished."""
    pairs = [
        f"('{c}', CASE WHEN s.doctype IN ({_doctypes_sql(c)}) THEN s.{c} END)"
        for c in OLD_STATUS_COLUMNS
    ]
    pairs += [f"('{c}', s.text_spacy)" for c in SPACY_STEPS]
    pairs.append(
        f"('{DOCUMENT_EMBEDDING_STEP}', CASE WHEN j.id IS NOT NULL THEN 1 END)"
    )
    return ", ".join(pairs)


def _create_constraints() -> None:
    """The keys and indexes of the status table, created after it is filled: one
    pass each instead of one check or index insertion per row."""
    op.create_primary_key(f"{TABLE}_pkey", TABLE, ["sdoc_id", "step"])
    op.create_foreign_key(
        f"{TABLE}_sdoc_id_fkey",
        TABLE,
        "sourcedocument",
        ["sdoc_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(f"ix_{TABLE}_step_status", TABLE, ["step", "status"], unique=False)
    op.create_index(
        f"ix_{TABLE}_unfinished",
        TABLE,
        ["status", "sdoc_id"],
        unique=False,
        postgresql_where=sa.text("status <> 1"),
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

    # 2) the status table, filled in one pass; the keys and indexes are created
    # afterwards
    op.create_table(
        TABLE,
        sa.Column("sdoc_id", sa.Integer(), nullable=False),
        sa.Column("step", sa.String(), nullable=False),
        sa.Column("status", sa.Integer(), nullable=False),
    )
    conn.execute(
        sa.text(
            f"INSERT INTO {TABLE} (sdoc_id, step, status) "
            "SELECT s.id, v.step, v.status FROM sourcedocument s "
            "LEFT JOIN sourcedocumentjobstatus j ON j.id = s.id "
            f"AND j.type = {ML_DOCUMENT_EMBEDDING} AND j.status = {ML_FINISHED} "
            f"CROSS JOIN LATERAL (VALUES {_unpivot_sql()}) AS v(step, status) "
            "WHERE v.status IS NOT NULL"
        )
    )
    _create_constraints()
    conn.execute(
        sa.text("DELETE FROM sourcedocumentjobstatus WHERE type IN (:doc, :sent)"),
        {"doc": ML_DOCUMENT_EMBEDDING, "sent": ML_SENTENCE_EMBEDDING},
    )

    # 3) catalog changes only: drop the step columns and processed_jobs
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument "
            + ", ".join(
                f"DROP COLUMN {c}" for c in ["processed_jobs", *OLD_STATUS_COLUMNS]
            )
        )
    )

    # 4) check that no document changed its status: the minimum of its step
    # statuses (-100 erroneous, 0 processing, 1 finished), finished without steps
    changed = conn.execute(
        sa.text(
            "SELECT count(*) FROM old_sdoc_status o LEFT JOIN ("
            f"SELECT sdoc_id, min(status) AS status FROM {TABLE} GROUP BY sdoc_id"
            ") n ON n.sdoc_id = o.id WHERE coalesce(n.status, 1) <> o.status"
        )
    ).scalar_one()
    if changed > 0:
        raise RuntimeError(
            f"Migration would change the processed_status of {changed} documents."
        )
    conn.execute(sa.text("DROP TABLE old_sdoc_status"))

    # 5) the pending feature activations of the project
    op.add_column(
        "project",
        sa.Column(
            "feature_activations",
            postgresql.JSONB(none_as_null=True, astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    conn = op.get_bind()

    # 0) the pending feature activations of the project
    op.drop_column("project", "feature_activations")

    # 1) the ML job DOCUMENT_EMBEDDING finished where the step finished
    conn.execute(
        sa.text(
            "INSERT INTO sourcedocumentjobstatus (id, type, status, timestamp) "
            f"SELECT sdoc_id, :type, :finished, now() FROM {TABLE} "
            "WHERE step = :step AND status = 1 "
            "ON CONFLICT (id, type) DO NOTHING"
        ),
        {
            "type": ML_DOCUMENT_EMBEDDING,
            "finished": ML_FINISHED,
            "step": DOCUMENT_EMBEDDING_STEP,
        },
    )

    # 2) the old columns, filled in one pass; a step that is not planned had the
    # default status processing (0) before
    conn.execute(
        sa.text(
            "ALTER TABLE sourcedocument "
            + ", ".join(f"ADD COLUMN {c} integer" for c in OLD_STATUS_COLUMNS)
        )
    )
    conn.execute(
        sa.text(
            "UPDATE sourcedocument s SET "
            + ", ".join(f"{c} = coalesce(p.{c}, 0)" for c in OLD_STATUS_COLUMNS)
            + " FROM sourcedocument d LEFT JOIN (SELECT sdoc_id, "
            + ", ".join(
                f"max(status) FILTER (WHERE step = '{c}') AS {c}"
                for c in OLD_STATUS_COLUMNS
            )
            + f" FROM {TABLE} GROUP BY sdoc_id) p ON p.sdoc_id = d.id "
            "WHERE d.id = s.id"
        )
    )

    # 3) the constraints and processed_jobs, in one table rewrite
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
    op.create_index(
        op.f("ix_sourcedocument_processed_jobs"),
        "sourcedocument",
        ["processed_jobs"],
        unique=False,
    )

    # 4) the status table
    op.drop_table(TABLE)
