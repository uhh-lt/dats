"""date_value date-only

Revision ID: 30159a61f051
Revises: e50bd0b25551
Create Date: 2026-10-05 15:58:42.416736

"""

import json
from datetime import datetime, timezone
from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "30159a61f051"
down_revision: str | None = "e50bd0b25551"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def __migrate_cota_search_space_dates() -> None:
    """Rewrite COTASentence.date in stored search spaces.

    Legacy search spaces store `date` as an ISO datetime string (e.g.
    "2021-08-27T00:00:00" or "2021-08-27T00:00:00+00:00"). Truncate each to
    its UTC calendar day ("2021-08-27").
    """
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, search_space FROM conceptovertimeanalysis "
            "WHERE search_space != '[]'"
        )
    ).all()
    for row_id, search_space in rows:
        sentences = json.loads(search_space)
        changed = False
        for sentence in sentences:
            value = sentence.get("date")
            if isinstance(value, str) and "T" in value:
                dt = datetime.fromisoformat(value)
                if dt.tzinfo is None:
                    # legacy naive datetimes were written as UTC
                    dt = dt.replace(tzinfo=timezone.utc)
                sentence["date"] = dt.astimezone(timezone.utc).date().isoformat()
                changed = True
        if changed:
            conn.execute(
                sa.text(
                    "UPDATE conceptovertimeanalysis SET search_space = :ss "
                    "WHERE id = :id"
                ),
                {"ss": json.dumps(sentences), "id": row_id},
            )


def upgrade() -> None:
    # Convert timestamptz -> date using the UTC calendar day (lossless: all
    # existing values were written as UTC instants, so the UTC date is the
    # intended calendar day).
    op.alter_column(
        "sourcedocumentmetadata",
        "date_value",
        existing_type=postgresql.TIMESTAMP(timezone=True),
        type_=sa.Date(),
        existing_nullable=True,
        postgresql_using="(date_value AT TIME ZONE 'UTC')::date",
    )

    __migrate_cota_search_space_dates()


def downgrade() -> None:
    # date -> timestamptz: interpret the calendar day as UTC midnight.
    op.alter_column(
        "sourcedocumentmetadata",
        "date_value",
        existing_type=sa.Date(),
        type_=postgresql.TIMESTAMP(timezone=True),
        existing_nullable=True,
        postgresql_using="(date_value::timestamp AT TIME ZONE 'UTC')",
    )
