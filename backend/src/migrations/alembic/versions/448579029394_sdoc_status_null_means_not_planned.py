"""sdoc status null means not planned

The step status columns of sourcedocument become nullable with default NULL
(= step not planned). Every column that is not a step of the document's doctype
is set to NULL. The computed column processed_jobs now counts the finished steps,
and the new computed columns total_jobs (planned steps) and processed_status
(-100 if any step is erroneous, 0 if any is processing, 1 otherwise) replace the
step count per doctype that the application used to compare against.

The upgrade checks that no document changes its processed_status and fails
(rolling back the migration) otherwise.

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

# Snapshot of the step status columns, in table order.
STATUS_COLUMNS = [
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

# Snapshot of the pipeline steps per doctype at this revision.
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

_ALL = ", ".join(STATUS_COLUMNS)
NEW_PROCESSED_JOBS_SQL = " + ".join(
    f"(CASE WHEN {c} = 1 THEN 1 ELSE 0 END)" for c in STATUS_COLUMNS
)
TOTAL_JOBS_SQL = " + ".join(
    f"(CASE WHEN {c} IS NULL THEN 0 ELSE 1 END)" for c in STATUS_COLUMNS
)
PROCESSED_STATUS_SQL = (
    f"CASE WHEN -100 IN ({_ALL}) THEN -100 WHEN 0 IN ({_ALL}) THEN 0 ELSE 1 END"
)
OLD_PROCESSED_JOBS_SQL = " + ".join(STATUS_COLUMNS)
# the processed_status of the application before this revision
OLD_PROCESSED_STATUS_SQL = (
    "CASE WHEN processed_jobs < 0 THEN -100 "
    + " ".join(
        f"WHEN doctype = '{doctype}' AND processed_jobs = {len(steps)} THEN 1"
        for doctype, steps in STEPS_BY_DOCTYPE.items()
    )
    + " ELSE 0 END"
)


def _add_computed(name: str, sql: str) -> None:
    op.add_column(
        "sourcedocument",
        sa.Column(name, sa.Integer(), sa.Computed(sql, persisted=True), nullable=False),
    )


def _unplan_steps_of_other_doctypes() -> None:
    """A step that is not part of the document's doctype is not planned."""
    conn = op.get_bind()
    for column in STATUS_COLUMNS:
        doctypes = [d for d, steps in STEPS_BY_DOCTYPE.items() if column in steps]
        conn.execute(
            sa.text(
                f"UPDATE sourcedocument SET {column} = NULL "
                "WHERE doctype <> ALL(:doctypes)"
            ),
            {"doctypes": doctypes},
        )


def upgrade() -> None:
    conn = op.get_bind()

    # remember the current status to check it is unchanged at the end
    conn.execute(
        sa.text(
            "CREATE TEMPORARY TABLE old_sdoc_status ON COMMIT DROP AS "
            f"SELECT id, {OLD_PROCESSED_STATUS_SQL} AS status FROM sourcedocument"
        )
    )

    # processed_jobs references the status columns, so it is recreated
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    op.drop_column("sourcedocument", "processed_jobs")

    for column in STATUS_COLUMNS:
        op.alter_column(
            "sourcedocument",
            column,
            existing_type=sa.INTEGER(),
            nullable=True,
            server_default=None,
            existing_server_default=sa.text("0"),
        )

    _unplan_steps_of_other_doctypes()

    _add_computed("processed_jobs", NEW_PROCESSED_JOBS_SQL)
    _add_computed("total_jobs", TOTAL_JOBS_SQL)
    _add_computed("processed_status", PROCESSED_STATUS_SQL)
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

    op.drop_index(
        op.f("ix_sourcedocument_processed_status"), table_name="sourcedocument"
    )
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    op.drop_column("sourcedocument", "processed_status")
    op.drop_column("sourcedocument", "total_jobs")
    op.drop_column("sourcedocument", "processed_jobs")

    # a step that is not planned had the default status processing (0) before
    for column in STATUS_COLUMNS:
        conn.execute(
            sa.text(f"UPDATE sourcedocument SET {column} = 0 WHERE {column} IS NULL")
        )
        op.alter_column(
            "sourcedocument",
            column,
            existing_type=sa.INTEGER(),
            nullable=False,
            server_default=sa.text("0"),
        )

    _add_computed("processed_jobs", OLD_PROCESSED_JOBS_SQL)
    op.create_index(
        op.f("ix_sourcedocument_processed_jobs"),
        "sourcedocument",
        ["processed_jobs"],
        unique=False,
    )
