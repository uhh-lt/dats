"""doc tag recommendation rework

Revision ID: 6e007e34f05f
Revises: 313ed5adfe76
Create Date: 2025-03-26 15:18:19.844967

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6e007e34f05f"
down_revision: Union[str, None] = "313ed5adfe76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(
        "ix_documenttagrecommendationjob_created",
        table_name="documenttagrecommendationjob",
    )
    op.drop_index(
        "ix_documenttagrecommendationjob_model_name",
        table_name="documenttagrecommendationjob",
    )
    op.drop_index(
        "ix_documenttagrecommendationjob_project_id",
        table_name="documenttagrecommendationjob",
    )
    op.drop_index(
        "ix_documenttagrecommendationjob_task_id",
        table_name="documenttagrecommendationjob",
    )
    op.drop_index(
        "ix_documenttagrecommendationjob_user_id",
        table_name="documenttagrecommendationjob",
    )
    op.add_column(
        "documenttagrecommendationlink",
        sa.Column("ml_job_id", sa.String(), nullable=True),
    )
    op.add_column(
        "documenttagrecommendationlink",
        sa.Column("is_reviewed", sa.Boolean(), nullable=True),
    )
    op.drop_index(
        "ix_documenttagrecommendationlink_is_accepted",
        table_name="documenttagrecommendationlink",
    )
    op.create_index(
        op.f("ix_documenttagrecommendationlink_is_reviewed"),
        "documenttagrecommendationlink",
        ["is_reviewed"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documenttagrecommendationlink_ml_job_id"),
        "documenttagrecommendationlink",
        ["ml_job_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documenttagrecommendationlink_predicted_tag_id"),
        "documenttagrecommendationlink",
        ["predicted_tag_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documenttagrecommendationlink_source_document_id"),
        "documenttagrecommendationlink",
        ["source_document_id"],
        unique=False,
    )
    op.drop_constraint(
        "documenttagrecommendationlink_recommendation_task_id_fkey",
        "documenttagrecommendationlink",
        type_="foreignkey",
    )
    op.drop_column("documenttagrecommendationlink", "recommendation_task_id")
    op.drop_column("documenttagrecommendationlink", "is_accepted")
    op.drop_table("documenttagrecommendationjob")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "documenttagrecommendationlink",
        sa.Column("is_accepted", sa.BOOLEAN(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "documenttagrecommendationlink",
        sa.Column(
            "recommendation_task_id", sa.INTEGER(), autoincrement=False, nullable=False
        ),
    )
    op.create_foreign_key(
        "documenttagrecommendationlink_recommendation_task_id_fkey",
        "documenttagrecommendationlink",
        "documenttagrecommendationjob",
        ["recommendation_task_id"],
        ["task_id"],
        ondelete="CASCADE",
    )
    op.drop_index(
        op.f("ix_documenttagrecommendationlink_source_document_id"),
        table_name="documenttagrecommendationlink",
    )
    op.drop_index(
        op.f("ix_documenttagrecommendationlink_predicted_tag_id"),
        table_name="documenttagrecommendationlink",
    )
    op.drop_index(
        op.f("ix_documenttagrecommendationlink_ml_job_id"),
        table_name="documenttagrecommendationlink",
    )
    op.drop_index(
        op.f("ix_documenttagrecommendationlink_is_reviewed"),
        table_name="documenttagrecommendationlink",
    )
    op.create_index(
        "ix_documenttagrecommendationlink_is_accepted",
        "documenttagrecommendationlink",
        ["is_accepted"],
        unique=False,
    )
    op.drop_column("documenttagrecommendationlink", "is_reviewed")
    op.drop_column("documenttagrecommendationlink", "ml_job_id")
    op.create_table(
        "documenttagrecommendationjob",
        sa.Column("task_id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("model_name", sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column(
            "created",
            postgresql.TIMESTAMP(),
            server_default=sa.text("now()"),
            autoincrement=False,
            nullable=False,
        ),
        sa.Column("user_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column("project_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            name="documenttagrecommendationjob_project_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            name="documenttagrecommendationjob_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("task_id", name="documenttagrecommendationjob_pkey"),
    )
    op.create_index(
        "ix_documenttagrecommendationjob_user_id",
        "documenttagrecommendationjob",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_documenttagrecommendationjob_task_id",
        "documenttagrecommendationjob",
        ["task_id"],
        unique=False,
    )
    op.create_index(
        "ix_documenttagrecommendationjob_project_id",
        "documenttagrecommendationjob",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        "ix_documenttagrecommendationjob_model_name",
        "documenttagrecommendationjob",
        ["model_name"],
        unique=False,
    )
    op.create_index(
        "ix_documenttagrecommendationjob_created",
        "documenttagrecommendationjob",
        ["created"],
        unique=False,
    )
    # ### end Alembic commands ###
