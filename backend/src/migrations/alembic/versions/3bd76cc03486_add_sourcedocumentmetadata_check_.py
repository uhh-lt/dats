"""Add SourceDocumentMetadata check constraint

Revision ID: 3bd76cc03486
Revises: 233bcdbdc177
Create Date: 2024-01-30 11:59:47.681534

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3bd76cc03486"
down_revision: str | None = "233bcdbdc177"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint(
        "CC_source_document_metadata_has_exactly_one_value",
        "sourcedocumentmetadata",
        """(
            CASE WHEN int_value IS NULL THEN 0 ELSE 1 END
            + CASE WHEN str_value IS NULL THEN 0 ELSE 1 END
            + CASE WHEN boolean_value IS NULL THEN 0 ELSE 1 END
            + CASE WHEN date_value IS NULL THEN 0 ELSE 1 END
            + CASE WHEN list_value IS NULL THEN 0 ELSE 1 END
        ) = 1
        """,
    )
