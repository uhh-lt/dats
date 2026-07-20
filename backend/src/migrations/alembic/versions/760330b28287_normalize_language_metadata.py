"""normalize language metadata

Revision ID: 760330b28287
Revises: 781d4852a256
Create Date: 2026-07-20 11:20:04.435538

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "760330b28287"
down_revision: str | None = "781d4852a256"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    # Get all project IDs
    project_ids = [
        row[0]
        for row in connection.execute(sa.text("SELECT id FROM project")).fetchall()
    ]
    print(f"Found {len(project_ids)} projects for language metadata normalization.")

    for project_id in project_ids:
        # Update and count rows affected per project
        result = connection.execute(
            sa.text(
                """
                UPDATE sourcedocumentmetadata
                SET str_value = CASE
                    WHEN str_value IN ('Language.german', 'Language.de') THEN 'de'
                    WHEN str_value IN ('Language.english', 'Language.en', 'Language.eng') THEN 'en'
                    WHEN str_value IN ('Language.italian', 'Language.it') THEN 'it'
                    ELSE str_value
                END
                WHERE project_metadata_id IN (
                    SELECT id FROM projectmetadata WHERE key = 'language' AND project_id = :project_id
                )
                AND str_value LIKE 'Language.%'
                """
            ),
            {"project_id": project_id},
        )
        print(f"Fixed {result.rowcount} times metadata in project id {project_id}")


def downgrade() -> None:
    pass
