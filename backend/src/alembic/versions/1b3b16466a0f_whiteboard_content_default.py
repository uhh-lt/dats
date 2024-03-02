"""whiteboard content default

Revision ID: 1b3b16466a0f
Revises: b9de10411f61
Create Date: 2024-03-01 13:56:12.356227

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1b3b16466a0f"
down_revision: Union[str, None] = "b9de10411f61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("whiteboard", "content", server_default='{"nodes":[],"edges":[]}')


def downgrade() -> None:
    pass
