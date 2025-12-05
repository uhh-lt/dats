"""add is_user_edited to perspectives cluster

Revision ID: 781d4852a256
Revises: bd2222f8198d
Create Date: 2025-12-05 10:34:27.311898

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "781d4852a256"
down_revision: str | None = "bd2222f8198d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("cluster", sa.Column("is_user_edited", sa.Boolean(), nullable=True))
    op.execute("UPDATE cluster SET is_user_edited = FALSE")
    op.alter_column(
        "cluster", "is_user_edited", existing_type=sa.Boolean(), nullable=False
    )


def downgrade() -> None:
    op.drop_column("cluster", "is_user_edited")
