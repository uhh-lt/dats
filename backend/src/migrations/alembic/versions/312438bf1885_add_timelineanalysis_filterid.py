"""add id to timeline analysis filter

Revision ID: 312438bf1885
Revises: 5bcc9d14725a
Create Date: 2024-10-15 12:29:23.410076

"""

import uuid
from typing import Any, Sequence

import sqlalchemy as sa
import srsly
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "312438bf1885"
down_revision: str | None = "5bcc9d14725a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # we need to update all existing timeline analysis columns' concept field to include the id
    conn = op.get_bind()
    res = conn.execute(
        sa.text("SELECT id, concepts FROM timelineanalysis WHERE concepts IS NOT NULL")
    )

    def add_id_to_filter(filter: Any):
        filter["id"] = str(uuid.uuid4())
        if "items" in filter:
            for item in filter["items"]:
                add_id_to_filter(item)

    for row in res:
        idx = row[0]
        concepts = row[1]

        concepts: Any = srsly.json_loads(concepts)
        for concept in concepts:
            add_id_to_filter(concept["filter"])

        conn.execute(
            sa.text(
                "UPDATE timelineanalysis SET concepts = :concepts WHERE id = :id"
            ).bindparams(concepts=srsly.json_dumps(concepts), id=idx)
        )


def downgrade() -> None:
    pass
