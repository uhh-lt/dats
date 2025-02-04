"""remove current code

Revision ID: 85d69d90d3e4
Revises: 714fa3c0323d
Create Date: 2024-09-26 14:59:52.379282

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "85d69d90d3e4"
down_revision: Union[str, None] = "714fa3c0323d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # add code id columns to bbox and span annotation
    op.add_column("bboxannotation", sa.Column("code_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        None, "bboxannotation", "code", ["code_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index(
        op.f("ix_bboxannotation_code_id"), "bboxannotation", ["code_id"], unique=False
    )
    op.add_column("spanannotation", sa.Column("code_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_spanannotation_code_id"), "spanannotation", ["code_id"], unique=False
    )
    op.create_foreign_key(
        None, "spanannotation", "code", ["code_id"], ["id"], ondelete="CASCADE"
    )

    # now, populate the code_id columns
    # basically, to get the code_id for span and bbox annotations, we need to get the code_id from the current code
    op.execute(
        """
        UPDATE spanannotation
        SET code_id = currentcode.code_id
        FROM currentcode
        WHERE spanannotation.current_code_id = currentcode.id
    """
    )

    op.execute(
        """
        UPDATE bboxannotation
        SET code_id = currentcode.code_id
        FROM currentcode
        WHERE bboxannotation.current_code_id = currentcode.id
    """
    )

    # now, make the columns not nullable
    op.alter_column("bboxannotation", "code_id", nullable=False)
    op.alter_column("spanannotation", "code_id", nullable=False)

    # remove everything related to current code
    op.drop_index("ix_currentcode_code_id", table_name="currentcode")
    op.drop_index("ix_currentcode_id", table_name="currentcode")
    op.drop_index("ix_bboxannotation_current_code_id", table_name="bboxannotation")
    op.drop_constraint(
        "bboxannotation_current_code_id_fkey", "bboxannotation", type_="foreignkey"
    )
    op.drop_column("bboxannotation", "current_code_id")
    op.drop_index("ix_objecthandle_current_code_id", table_name="objecthandle")
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
            "source_document_id",
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
            sa.text("coalesce(source_document_id, 0)"),
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
        "objecthandle_current_code_id_fkey", "objecthandle", type_="foreignkey"
    )
    op.drop_index("ix_spanannotation_current_code_id", table_name="spanannotation")
    op.drop_constraint(
        "spanannotation_current_code_id_fkey", "spanannotation", type_="foreignkey"
    )
    op.drop_column("objecthandle", "current_code_id")
    op.drop_column("spanannotation", "current_code_id")
    op.drop_table("currentcode")


def downgrade() -> None:
    raise RuntimeError("Downgrade not supported")
