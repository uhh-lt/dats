"""migrate timeline analysis filters

Revision ID: 16b735a5f8f5
Revises: 760330b28287
Create Date: 2026-07-21 10:03:05.538831

"""

from typing import Sequence

import sqlalchemy as sa
import srsly
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "16b735a5f8f5"
down_revision: str | None = "760330b28287"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # We need to update all existing timeline analysis concepts field
    conn = op.get_bind()
    res = conn.execute(
        sa.text("SELECT id, concepts FROM timelineanalysis WHERE concepts IS NOT NULL")
    )

    column_mapping_up = {
        "SD_TAG_ID_LIST": "SD_TAG_ID_LIST_RECURSIVE",
        "SD_CODE_ID_LIST": "SD_CODE_ID_LIST_RECURSIVE",
        "BB_TAG_ID_LIST": "BB_TAG_ID_LIST_RECURSIVE",
        "SentAnno_TAG_ID_LIST": "SentAnno_TAG_ID_LIST_RECURSIVE",
        "SP_TAG_ID_LIST": "SP_TAG_ID_LIST_RECURSIVE",
        "WF_TAG_ID_LIST": "WF_TAG_ID_LIST_RECURSIVE",
        "WF_CODE_ID_LIST": "WF_CODE_ID_LIST_RECURSIVE",
    }

    operator_mapping_up = {
        "ID_LIST_CONTAINS": "IDLR_CONTAINS",
        "ID_LIST_NOT_CONTAINS": "IDLR_NOT_CONTAINS",
    }

    def migrate_filter_node(node: dict) -> None:
        if not isinstance(node, dict):
            return  # pyright: ignore[reportUnreachable]
        # FilterExpression
        if "column" in node and "operator" in node:
            col = node["column"]
            if isinstance(col, str) and col in column_mapping_up:
                node["column"] = column_mapping_up[col]
                op_val = node["operator"]
                if isinstance(op_val, str) and op_val in operator_mapping_up:
                    node["operator"] = operator_mapping_up[op_val]
        # Filter (recursive group)
        if "items" in node and isinstance(node["items"], list):
            for item in node["items"]:
                migrate_filter_node(item)

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
                    migrate_filter_node(filter_obj)
                    updated = True

        if updated:
            conn.execute(
                sa.text(
                    "UPDATE timelineanalysis SET concepts = :concepts WHERE id = :id"
                ).bindparams(concepts=srsly.json_dumps(concepts), id=idx)
            )
            updates += 1

    print(
        f"Updated {updates} timeline analysis concepts with new filter column/operator names."
    )


def downgrade() -> None:
    pass
