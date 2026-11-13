"""add project enabled features

Projects get the list of their enabled features. Every existing project enables
all features, so its documents keep all their steps and nothing is recomputed.

Revision ID: f0bfbe883d73
Revises: 448579029394
Create Date: 2026-11-10 13:31:37.189983

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f0bfbe883d73"
down_revision: str | None = "448579029394"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Snapshot of the Feature values at this revision, in enum order.
ALL_FEATURES = [
    "full_text_search",
    "search_annotate",
    "sentence_similarity_search",
    "image_similarity_search",
    "rag_chat",
    "annotation_scaling",
    "concepts_over_time",
    "tag_recommendation",
    "word_frequency",
    "duplicate_finder",
    "keyword_statistics",
    "entity_annotations",
    "image_captions",
    "object_detection",
]


def upgrade() -> None:
    # 1) add the column, nullable until it is filled
    op.add_column(
        "project",
        sa.Column("enabled_features", postgresql.ARRAY(sa.String()), nullable=True),
    )

    # 2) existing projects enable all features
    op.get_bind().execute(
        sa.text("UPDATE project SET enabled_features = :features"),
        {"features": ALL_FEATURES},
    )
    op.alter_column("project", "enabled_features", nullable=False)


def downgrade() -> None:
    op.drop_column("project", "enabled_features")
