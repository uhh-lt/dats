"""natural sort for sdoc name

Revision ID: 3eb39b9eb456
Revises: 07c06f167688
Create Date: 2025-09-18 14:20:12.196688

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3eb39b9eb456"
down_revision: str | None = "07c06f167688"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE COLLATION natsort (provider = icu, locale = 'und-u-kn-true');")
    op.execute("UPDATE sourcedocument SET name = filename WHERE name IS NULL;")
    op.alter_column(
        "sourcedocument",
        "name",
        existing_type=sa.VARCHAR(),
        type_=sa.String(collation="natsort"),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "sourcedocument",
        "name",
        existing_type=sa.VARCHAR(),
        type_=sa.String(),
        nullable=True,
    )
    op.execute("DROP COLLATION IF EXISTS natsort;")
