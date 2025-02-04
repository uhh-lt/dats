"""hierarchical document tags

Revision ID: dac9e104b3c2
Revises: fa0b606ae578
Create Date: 2023-11-27 13:17:44.498459

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "dac9e104b3c2"
down_revision: Union[str, None] = "fa0b606ae578"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # document tags are hierarchical
    op.add_column(
        "documenttag", sa.Column("parent_tag_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "documenttag_parent_tag_id_fkey",
        "documenttag",
        "documenttag",
        ["parent_tag_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "documenttag_parent_tag_id_fkey", "documenttag", type_="foreignkey"
    )
    op.drop_column("documenttag", "parent_tag_id")
