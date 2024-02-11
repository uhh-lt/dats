"""add word_frequencies to SourceDocumentData

Revision ID: b0ac316511e1
Revises: 3bd76cc03486
Create Date: 2024-02-10 17:50:19.307561

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b9de10411f61"
down_revision: Union[str, None] = "3bd76cc03486"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sourcedocumentdata",
        sa.Column("word_frequencies", sa.String(), server_default="[]", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("sourcedocumentdata", "word_frequencies")
