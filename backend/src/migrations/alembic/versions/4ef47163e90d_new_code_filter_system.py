"""Remove persisted filters from the pre-versioned code filter system.

Revision ID: 4ef47163e90d
Revises: 5b98d810b557
Create Date: 2026-07-24 13:41:02.594700

"""

from typing import Any, Sequence

import sqlalchemy as sa
import srsly
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4ef47163e90d"
down_revision: str | None = "5b98d810b557"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Delete legacy code expressions from saved timeline-analysis filters.

    Old values were ambiguous integer row IDs. They cannot be safely translated
    into the new explicit concept/snapshot semantics, so affected users will
    recreate only those code expressions. Other expressions and groups remain.
    """
    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, concepts FROM timelineanalysis WHERE concepts IS NOT NULL")
    )
    updated_rows = 0
    removed_expressions = 0

    def clean_filter(node: Any, *, is_root: bool = False) -> tuple[Any | None, int]:
        if not isinstance(node, dict):
            return node, 0
        column = node.get("column")
        if isinstance(column, str) and "CODE_ID" in column:
            return None, 1

        items = node.get("items")
        if not isinstance(items, list):
            return node, 0
        cleaned_items: list[Any] = []
        removed = 0
        for item in items:
            cleaned, item_removed = clean_filter(item)
            removed += item_removed
            if cleaned is not None:
                cleaned_items.append(cleaned)
        node["items"] = cleaned_items
        if not is_root and not cleaned_items:
            return None, removed
        return node, removed

    for row in rows:
        timeline_id = row[0]
        concepts_value = row[1]
        if not concepts_value:
            continue
        try:
            concepts = srsly.json_loads(concepts_value)
        except Exception:
            continue
        if not isinstance(concepts, list):
            continue

        row_removed = 0
        for concept in concepts:
            if not isinstance(concept, dict):
                continue
            type_filter = concept.get("ta_specific_filter")
            if not isinstance(type_filter, dict):
                continue
            filter_value = type_filter.get("filter")
            cleaned_filter, removed = clean_filter(filter_value, is_root=True)
            row_removed += removed
            if cleaned_filter is not None:
                type_filter["filter"] = cleaned_filter

        if row_removed == 0:
            continue
        connection.execute(
            sa.text(
                "UPDATE timelineanalysis SET concepts = :concepts WHERE id = :id"
            ).bindparams(
                concepts=srsly.json_dumps(concepts),
                id=timeline_id,
            )
        )
        updated_rows += 1
        removed_expressions += row_removed

    print(
        f"Removed {removed_expressions} legacy code filter expression(s) "
        f"from {updated_rows} timeline analysis row(s)."
    )


def downgrade() -> None:
    # Removed filter expressions cannot be reconstructed.
    pass
