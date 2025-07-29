"""remove indices tag code

Revision ID: 2b91203d1bb6
Revises: e0a8fb361b1e
Create Date: 2024-05-29 17:52:51.388460

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2b91203d1bb6"
down_revision: str | None = "e0a8fb361b1e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_code_color", table_name="code")
    op.drop_index("ix_code_description", table_name="code")
    op.drop_index("ix_documenttag_description", table_name="documenttag")


def downgrade() -> None:
    op.create_index(
        "ix_documenttag_description", "documenttag", ["description"], unique=False
    )
    op.create_index("ix_code_description", "code", ["description"], unique=False)
    op.create_index("ix_code_color", "code", ["color"], unique=False)
