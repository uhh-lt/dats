"""migrate timeline analysis code filters

Revision ID: 367aa851a9a7
Revises: 30159a61f051
Create Date: 2026-10-19 17:00:00.000000

"""

from typing import Sequence

import sqlalchemy as sa
import srsly
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "367aa851a9a7"
down_revision: str | None = "30159a61f051"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The annotation code columns were renamed to *_CODE_ID_LIST_RECURSIVE and now
    # take ID_LIST_RECURSIVE operators instead of ID operators. Timeline analysis
    # concepts store their filters as JSON, so rewrite the stored filters.
    conn = op.get_bind()
    res = conn.execute(
        sa.text("SELECT id, concepts FROM timelineanalysis WHERE concepts IS NOT NULL")
    )

    column_mapping_up = {
        "SP_CODE_ID": "SP_CODE_ID_LIST_RECURSIVE",
        "SentAnno_CODE_ID": "SentAnno_CODE_ID_LIST_RECURSIVE",
        "BB_CODE_ID": "BB_CODE_ID_LIST_RECURSIVE",
    }

    # Each annotation has exactly one code, so "equals" becomes "contains"
    # (non-recursive) to keep the old semantics.
    operator_mapping_up = {
        "ID_EQUALS": "IDLR_CONTAINS",
        "ID_NOT_EQUALS": "IDLR_NOT_CONTAINS",
    }

    def migrate_filter_node(node: dict) -> bool:
        if not isinstance(node, dict):
            return False  # pyright: ignore[reportUnreachable]
        changed = False
        # FilterExpression
        if "column" in node and "operator" in node:
            col = node["column"]
            if isinstance(col, str) and col in column_mapping_up:
                node["column"] = column_mapping_up[col]
                op_val = node["operator"]
                if isinstance(op_val, str) and op_val in operator_mapping_up:
                    node["operator"] = operator_mapping_up[op_val]
                changed = True
        # Filter (recursive group)
        if "items" in node and isinstance(node["items"], list):
            for item in node["items"]:
                changed = migrate_filter_node(item) or changed
        return changed

    updates = 0
    for row in res:
        idx = row[0]
        concepts_str = row[1]
        if not concepts_str:
            continue

        try:
            concepts = srsly.json_loads(concepts_str)
        except Exception:
            continue

        if not isinstance(concepts, list):
            continue

        updated = False
        for concept in concepts:
            if not isinstance(concept, dict):
                continue
            ta_filter = concept.get("ta_specific_filter")
            if isinstance(ta_filter, dict):
                filter_obj = ta_filter.get("filter")
                if isinstance(filter_obj, dict):
                    updated = migrate_filter_node(filter_obj) or updated

        if updated:
            conn.execute(
                sa.text(
                    "UPDATE timelineanalysis SET concepts = :concepts WHERE id = :id"
                ).bindparams(concepts=srsly.json_dumps(concepts), id=idx)
            )
            updates += 1

    print(f"Updated {updates} timeline analyses with new code filter column names.")


def downgrade() -> None:
    pass
