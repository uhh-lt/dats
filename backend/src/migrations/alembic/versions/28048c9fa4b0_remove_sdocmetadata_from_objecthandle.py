"""remove SourceDocumentMetadata from ObjectHandle

Revision ID: 28048c9fa4b0
Revises: 1d61abe5e5d6
Create Date: 2023-11-27 14:03:56.711994

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "28048c9fa4b0"
down_revision: str | None = "1d61abe5e5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(
        "ix_objecthandle_source_document_metadata_id", table_name="objecthandle"
    )
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
        [
            "user_id",
            "project_id",
            "code_id",
            "current_code_id",
            "source_document_id",
            "annotation_document_id",
            "span_annotation_id",
            "span_group_id",
            "document_tag_id",
            "action_id",
            "memo_id",
        ],
    )
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.text("coalesce(user_id, 0)"),
            sa.text("coalesce(project_id, 0)"),
            sa.text("coalesce(code_id, 0)"),
            sa.text("coalesce(current_code_id, 0)"),
            sa.text("coalesce(source_document_id, 0)"),
            sa.text("coalesce(annotation_document_id, 0)"),
            sa.text("coalesce(span_annotation_id, 0)"),
            sa.text("coalesce(bbox_annotation_id, 0)"),
            sa.text("coalesce(span_group_id, 0)"),
            sa.text("coalesce(document_tag_id, 0)"),
            sa.text("coalesce(action_id, 0)"),
            sa.text("coalesce(memo_id, 0)"),
        ],
        unique=True,
    )
    op.drop_constraint(
        "objecthandle_source_document_metadata_id_fkey",
        "objecthandle",
        type_="foreignkey",
    )
    op.drop_column("objecthandle", "source_document_metadata_id")


def downgrade() -> None:
    op.add_column(
        "objecthandle",
        sa.Column(
            "source_document_metadata_id",
            sa.INTEGER(),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "objecthandle_source_document_metadata_id_fkey",
        "objecthandle",
        "sourcedocumentmetadata",
        ["source_document_metadata_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_index("idx_for_uc_work_with_null", table_name="objecthandle")
    op.create_index(
        "idx_for_uc_work_with_null",
        "objecthandle",
        [
            sa.text("COALESCE(user_id, 0)"),
            sa.text("COALESCE(project_id, 0)"),
            sa.text("COALESCE(code_id, 0)"),
            sa.text("COALESCE(current_code_id, 0)"),
            sa.text("COALESCE(source_document_id, 0)"),
            sa.text("COALESCE(source_document_metadata_id, 0)"),
            sa.text("COALESCE(annotation_document_id, 0)"),
            sa.text("COALESCE(span_annotation_id, 0)"),
            sa.text("COALESCE(bbox_annotation_id, 0)"),
            sa.text("COALESCE(span_group_id, 0)"),
            sa.text("COALESCE(document_tag_id, 0)"),
            sa.text("COALESCE(action_id, 0)"),
            sa.text("COALESCE(memo_id, 0)"),
        ],
        unique=False,
    )
    op.drop_constraint(
        "UC_only_one_object_handle_per_instance", "objecthandle", type_="unique"
    )
    op.create_unique_constraint(
        "UC_only_one_object_handle_per_instance",
        "objecthandle",
        [
            "user_id",
            "project_id",
            "code_id",
            "current_code_id",
            "source_document_id",
            "source_document_metadata_id",
            "annotation_document_id",
            "span_annotation_id",
            "span_group_id",
            "document_tag_id",
            "action_id",
            "memo_id",
        ],
    )
    op.create_index(
        "ix_objecthandle_source_document_metadata_id",
        "objecthandle",
        ["source_document_metadata_id"],
        unique=False,
    )
