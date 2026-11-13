"""drop the image captions toggle

Image captions are a core artefact and no longer a feature: every image gets a
caption. Projects drop the feature "image_captions" from their enabled features
and its pending activation. The downgrade does nothing: a project without the
feature is valid before this revision too.

Revision ID: 41c2d56be9f3
Revises: f0bfbe883d73
Create Date: 2026-11-13 17:15:15.716306

"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "41c2d56be9f3"
down_revision: str | None = "f0bfbe883d73"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE project SET "
        "enabled_features = array_remove(enabled_features, 'image_captions'), "
        "feature_activations = feature_activations - 'image_captions'"
    )


def downgrade() -> None:
    pass
