"""add refresh tokens

Revision ID: 07cd5e426937
Revises: 3a069450bef3
Create Date: 2023-11-20 17:12:46.919012

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "07cd5e426937"
down_revision: Union[str, None] = "3a069450bef3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refreshtoken",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_refreshtoken_id"), "refreshtoken", ["id"], unique=False)
    op.create_index(
        op.f("ix_refreshtoken_token"), "refreshtoken", ["token"], unique=False
    )
    op.create_index(
        op.f("ix_refreshtoken_user_id"), "refreshtoken", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_refreshtoken_user_id"), table_name="refreshtoken")
    op.drop_index(op.f("ix_refreshtoken_token"), table_name="refreshtoken")
    op.drop_index(op.f("ix_refreshtoken_id"), table_name="refreshtoken")
    op.drop_table("refreshtoken")
