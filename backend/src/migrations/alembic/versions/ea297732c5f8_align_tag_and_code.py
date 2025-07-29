"""align tag and code

Revision ID: ea297732c5f8
Revises: 1b3b16466a0f
Create Date: 2024-05-15 07:19:29.866074

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ea297732c5f8"
down_revision: str | None = "1b3b16466a0f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # rename code table's parent_code_id to parent_id
    op.drop_constraint(
        "UC_name_unique_per_user_parent_and_project", "code", type_="unique"
    )
    op.alter_column("code", "parent_code_id", new_column_name="parent_id")
    op.create_unique_constraint(
        "UC_name_unique_per_user_parent_and_project",
        "code",
        ["user_id", "project_id", "name", "parent_id"],
    )

    # rename documenttag table's parent_tag_id to parent_id
    op.alter_column("documenttag", "parent_tag_id", new_column_name="parent_id")

    # rename documenttag table's title to name
    op.alter_column("documenttag", "title", new_column_name="name")

    # remove title and add name index to documenttag table
    op.drop_index("ix_documenttag_title", table_name="documenttag")
    op.create_index(op.f("ix_documenttag_name"), "documenttag", ["name"], unique=False)


def downgrade() -> None:
    pass
