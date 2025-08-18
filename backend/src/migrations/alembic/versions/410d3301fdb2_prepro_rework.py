"""prepro rework

Revision ID: 410d3301fdb2
Revises: 1b21abe44adb
Create Date: 2025-08-14 13:21:40.438093

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "410d3301fdb2"
down_revision: str | None = "1b21abe44adb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # add new status columns
    op.add_column(
        "sourcedocument",
        sa.Column("extract_html", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("text_extraction", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "text_language_detection", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("text_spacy", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("text_es_index", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "text_sentence_embedding", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "text_html_mapping", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("image_caption", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("image_embedding", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "image_metadata_extraction",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("image_thumbnail", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "image_object_detection", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("audio_metadata", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("audio_thumbnail", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "audio_transcription", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("video_metadata", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column("video_thumbnail", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "video_audio_extraction", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "sourcedocument",
        sa.Column(
            "processed_jobs",
            sa.Integer(),
            sa.Computed(
                "extract_html + text_extraction + text_language_detection + text_spacy + text_es_index + text_sentence_embedding + text_html_mapping + image_caption + image_embedding + image_metadata_extraction + image_thumbnail + image_object_detection + audio_metadata + audio_thumbnail + audio_transcription + video_metadata + video_thumbnail + video_audio_extraction",
                persisted=True,
            ),
            nullable=False,
        ),
    )

    # --- Batch migration of status fields per project ---
    # Source Document Status migration:
    # based on the old status (unfinished/error and finished) and the doc type, we need to set the correct value for our status field
    # doctype text -> 7: extract_html, text_extraction, text_language_detection, text_spacy, text_es_index, text_sentence_embedding, text_html_mapping
    # doctype image -> 11: image_caption, image_embedding, image_metadata_extraction, image_thumbnail, image_object_detection, text_extraction, text_language_detection, text_spacy, text_es_index, text_sentence_embedding, text_html_mapping
    # doctype audio -> 9: audio_metadata, audio_thumbnail, audio_transcription, text_extraction, text_language_detection, text_spacy, text_es_index, text_sentence_embedding, text_html_mapping
    # doctype video -> 10: video_metadata, video_thumbnail, video_audio_extraction, audio_transcription, text_extraction, text_language_detection, text_spacy, text_es_index, text_sentence_embedding, text_html_mapping
    # if status was unfinished_or_erroneous -> set the corresponding fields to -100
    # if status was finished -> set the corresponding fields to 1
    # old status column used to be an enum with two string values:
    # unfinished_or_erroneous = "unfinished_or_erroneous"
    # finished = "finished"  # preprocessing has finished

    connection = op.get_bind()
    # Get all project IDs
    project_ids = [
        row[0]
        for row in connection.execute(sa.text("SELECT id FROM project")).fetchall()
    ]
    print(f"Found {len(project_ids)} projects for migration.")

    # Define job fields per doctype
    job_fields = {
        "text": [
            "extract_html",
            "text_extraction",
            "text_language_detection",
            "text_spacy",
            "text_es_index",
            "text_sentence_embedding",
            "text_html_mapping",
        ],
        "image": [
            "image_caption",
            "image_embedding",
            "image_metadata_extraction",
            "image_thumbnail",
            "image_object_detection",
            "text_extraction",
            "text_language_detection",
            "text_spacy",
            "text_es_index",
            "text_sentence_embedding",
            "text_html_mapping",
        ],
        "audio": [
            "audio_metadata",
            "audio_thumbnail",
            "audio_transcription",
            "text_extraction",
            "text_language_detection",
            "text_spacy",
            "text_es_index",
            "text_sentence_embedding",
            "text_html_mapping",
        ],
        "video": [
            "video_metadata",
            "video_thumbnail",
            "video_audio_extraction",
            "audio_transcription",
            "text_extraction",
            "text_language_detection",
            "text_spacy",
            "text_es_index",
            "text_sentence_embedding",
            "text_html_mapping",
        ],
    }

    for project_id in project_ids:
        print(f"Migrating sourcedocuments for project {project_id}...")
        # Get all unique (doctype, status) pairs for this project
        pairs = connection.execute(
            sa.text(
                "SELECT doctype, status, COUNT(*) FROM sourcedocument WHERE project_id = :pid GROUP BY doctype, status"
            ),
            {"pid": project_id},
        ).fetchall()
        print(f"  Found {len(pairs)} unique (doctype, status) pairs.")
        for doctype, status, count in pairs:
            if status == "unfinished_or_erroneous":
                value = -100
            elif status == "finished":
                value = 1
            else:
                value = 0
            update_fields = {}
            for field in job_fields.get(doctype, []):
                update_fields[field] = value
            if update_fields:
                set_clause = ", ".join(
                    [f"{field} = :{field}" for field in update_fields]
                )
                params = {
                    **update_fields,
                    "pid": project_id,
                    "doctype": doctype,
                    "status": status,
                }
                connection.execute(
                    sa.text(
                        f"UPDATE sourcedocument SET {set_clause} WHERE project_id = :pid AND doctype = :doctype AND status = :status"
                    ),
                    params,
                )
                print(
                    f"    Updated {count} sourcedocuments (doctype={doctype}, status={status}) with value {value}."
                )

    print("Batch migration of status fields complete.")

    # remove old status column
    op.drop_index("ix_sourcedocument_status", table_name="sourcedocument")
    op.create_index(
        op.f("ix_sourcedocument_processed_jobs"),
        "sourcedocument",
        ["processed_jobs"],
        unique=False,
    )
    op.drop_column("sourcedocument", "status")

    # project metadata key migration
    # we renamed the following keys in the projectmetadata table:
    # transcription_keywords -> keywords
    connection.execute(
        sa.text(
            "UPDATE projectmetadata SET key = 'keywords' WHERE key = 'transcription_keywords'"
        )
    )
    print("Project metadata key migration complete.")

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "sourcedocument",
        sa.Column("status", sa.VARCHAR(), autoincrement=False, nullable=False),
    )
    op.drop_index(op.f("ix_sourcedocument_processed_jobs"), table_name="sourcedocument")
    op.create_index(
        "ix_sourcedocument_status", "sourcedocument", ["status"], unique=False
    )
    op.drop_column("sourcedocument", "processed_jobs")
    op.drop_column("sourcedocument", "video_audio_extraction")
    op.drop_column("sourcedocument", "video_thumbnail")
    op.drop_column("sourcedocument", "video_metadata")
    op.drop_column("sourcedocument", "audio_transcription")
    op.drop_column("sourcedocument", "audio_thumbnail")
    op.drop_column("sourcedocument", "audio_metadata")
    op.drop_column("sourcedocument", "image_object_detection")
    op.drop_column("sourcedocument", "image_thumbnail")
    op.drop_column("sourcedocument", "image_metadata_extraction")
    op.drop_column("sourcedocument", "image_embedding")
    op.drop_column("sourcedocument", "image_caption")
    op.drop_column("sourcedocument", "text_html_mapping")
    op.drop_column("sourcedocument", "text_sentence_embedding")
    op.drop_column("sourcedocument", "text_es_index")
    op.drop_column("sourcedocument", "text_spacy")
    op.drop_column("sourcedocument", "text_language_detection")
    op.drop_column("sourcedocument", "text_extraction")
    op.drop_column("sourcedocument", "extract_html")
    # ### end Alembic commands ###
