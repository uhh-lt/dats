"""rename documenttag to tag

Revision ID: 7c617b019b45
Revises: 15b53f767991
Create Date: 2025-07-29 18:13:03.953704

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c617b019b45"
down_revision: str | None = "15b53f767991"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop old foreign key for objecthandle.document_tag_id
    op.drop_constraint(
        "objecthandle_document_tag_id_fkey", "objecthandle", type_="foreignkey"
    )
    # Drop indexes for objecthandle
    op.drop_index("ix_objecthandle_document_tag_id", table_name="objecthandle")
    # Drop unique constraint for objecthandle
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    # Drop idx_for_uc_work_with_null index for objecthandle
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")

    # Rename tables
    op.rename_table("documenttag", "tag")
    op.rename_table("sourcedocumentdocumenttaglinktable", "sourcedocumenttaglinktable")
    op.rename_table("documenttagrecommendationlink", "tagrecommendationlink")

    # Rename column in objecthandle
    op.alter_column("objecthandle", "document_tag_id", new_column_name="tag_id")

    # Rename indexes for tag table (formerly documenttag)
    op.execute("ALTER INDEX ix_documenttag_id RENAME TO ix_tag_id")
    op.execute("ALTER INDEX ix_documenttag_name RENAME TO ix_tag_name")
    op.execute("ALTER INDEX ix_documenttag_created RENAME TO ix_tag_created")
    op.execute("ALTER INDEX ix_documenttag_project_id RENAME TO ix_tag_project_id")
    op.execute("ALTER INDEX ix_documenttag_parent_id RENAME TO ix_tag_parent_id")

    # Rename indexes for tagrecommendationlink (formerly documenttagrecommendationlink)
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_id RENAME TO ix_tagrecommendationlink_id"
    )
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_ml_job_id RENAME TO ix_tagrecommendationlink_ml_job_id"
    )
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_prediction_score RENAME TO ix_tagrecommendationlink_prediction_score"
    )
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_is_reviewed RENAME TO ix_tagrecommendationlink_is_reviewed"
    )
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_source_document_id RENAME TO ix_tagrecommendationlink_source_document_id"
    )
    op.execute(
        "ALTER INDEX ix_documenttagrecommendationlink_predicted_tag_id RENAME TO ix_tagrecommendationlink_predicted_tag_id"
    )

    # Create new foreign key for objecthandle.tag_id
    op.create_foreign_key(
        None, "objecthandle", "tag", ["tag_id"], ["id"], ondelete="CASCADE"
    )

    # Recreate indexes for objecthandle
    op.create_index("ix_objecthandle_tag_id", "objecthandle", ["tag_id"])

    # Recreate unique constraint for objecthandle
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
        [
            "user_id",
            "project_id",
            "code_id",
            "memo_id",
            "source_document_id",
            "span_annotation_id",
            "bbox_annotation_id",
            "sentence_annotation_id",
            "span_group_id",
            "tag_id",
        ],
    )

    # Recreate idx_for_uc_work_with_null index for objecthandle
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.text("coalesce(user_id, 0)"),
            sa.text("coalesce(project_id, 0)"),
            sa.text("coalesce(code_id, 0)"),
            sa.text("coalesce(source_document_id, 0)"),
            sa.text("coalesce(span_annotation_id, 0)"),
            sa.text("coalesce(bbox_annotation_id, 0)"),
            sa.text("coalesce(sentence_annotation_id, 0)"),
            sa.text("coalesce(span_group_id, 0)"),
            sa.text("coalesce(tag_id, 0)"),
            sa.text("coalesce(memo_id, 0)"),
        ],
        unique=True,
    )


def downgrade() -> None:
    pass
