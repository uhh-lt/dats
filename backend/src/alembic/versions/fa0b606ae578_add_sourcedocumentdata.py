"""add SourceDocumentData

Revision ID: fa0b606ae578
Revises:
Create Date: 2023-11-08 14:42:44.947147

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "fa0b606ae578"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "version",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sourcedocumentdata",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("html", sa.String(), nullable=False),
        sa.Column("token_starts", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("token_ends", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("sentence_starts", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.Column("sentence_ends", postgresql.ARRAY(sa.Integer()), nullable=False),
        sa.ForeignKeyConstraint(["id"], ["sourcedocument.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sourcedocumentdata_id"), "sourcedocumentdata", ["id"], unique=False
    )
    op.add_column("sourcedocument", sa.Column("name", sa.String(), nullable=True))
    op.create_index(
        op.f("ix_sourcedocument_name"), "sourcedocument", ["name"], unique=False
    )
    op.drop_column("sourcedocument", "content")


def downgrade() -> None:
    op.add_column(
        "sourcedocument",
        sa.Column(
            "content", sa.VARCHAR(), autoincrement=False, nullable=False, default=""
        ),
    )
    op.drop_index(op.f("ix_sourcedocument_name"), table_name="sourcedocument")
    op.drop_column("sourcedocument", "name")
    op.drop_index(op.f("ix_sourcedocumentdata_id"), table_name="sourcedocumentdata")
    op.drop_table("sourcedocumentdata")
    op.drop_table("version")
