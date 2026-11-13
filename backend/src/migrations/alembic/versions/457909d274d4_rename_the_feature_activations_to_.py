"""rename the feature activations to artefact computations

The pending feature activations (feature value -> activation id) become the
pending artefact computations (computation id -> artefact values). The column
is renamed and reset: a pending activation of the old form cannot be
translated (its job cannot be loaded either). The downgrade renames back and
resets as well.

Revision ID: 457909d274d4
Revises: 41c2d56be9f3
Create Date: 2026-11-13 18:11:21.105209

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "457909d274d4"
down_revision: str | None = "41c2d56be9f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "project", "feature_activations", new_column_name="artefact_computations"
    )
    op.execute("UPDATE project SET artefact_computations = '{}'::jsonb")


def downgrade() -> None:
    op.alter_column(
        "project", "artefact_computations", new_column_name="feature_activations"
    )
    op.execute("UPDATE project SET feature_activations = '{}'::jsonb")
