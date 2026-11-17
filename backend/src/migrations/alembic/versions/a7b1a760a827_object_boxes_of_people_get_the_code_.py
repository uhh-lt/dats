"""object boxes of people get the code HUMAN

The object detection marked people with the named-entity code PERSON. Every
project with the COCO system codes gets the system code HUMAN (a sibling of
the top COCO codes), and the bbox annotations of the system user with the
code PERSON move to it. Bbox annotations of other users stay on PERSON.

A project that already has a code named HUMAN that is not that system code
(a user code, or a system code elsewhere) is skipped: it gets no code and its
person boxes stay on PERSON, as code names are unique per project.

Revision ID: a7b1a760a827
Revises: 62a07ecd1e32
Create Date: 2026-11-17 16:16:23.191061

"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

from utils.color_utils import get_next_color

# revision identifiers, used by Alembic.
revision: str = "a7b1a760a827"
down_revision: str | None = "62a07ecd1e32"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SYSTEM_USER_ID = 1
HUMAN = "HUMAN"
HUMAN_DESCRIPTION = "Object Category from COCO 2017"
PERSON = "PERSON"
# a top COCO code: the projects that have it have the COCO system codes, and
# HUMAN becomes its sibling
COCO_SIBLING = "ANIMAL"


def _coco_projects(conn: sa.Connection) -> list[sa.Row]:
    """(project_id, parent_id, enabled) of the top COCO system code per project."""
    return list(
        conn.execute(
            sa.text(
                "SELECT project_id, parent_id, enabled FROM code "
                "WHERE name = :name AND is_system"
            ),
            {"name": COCO_SIBLING},
        )
    )


def _code(conn: sa.Connection, project_id: int, name: str) -> sa.Row | None:
    return conn.execute(
        sa.text(
            "SELECT id, is_system, parent_id FROM code "
            "WHERE project_id = :project_id AND name = :name"
        ),
        {"project_id": project_id, "name": name},
    ).one_or_none()


def upgrade() -> None:
    conn = op.get_bind()
    created = moved = skipped = 0
    for project_id, parent_id, enabled in _coco_projects(conn):
        human = _code(conn, project_id, HUMAN)
        if human is None:
            human_id = conn.execute(
                sa.text(
                    "INSERT INTO code (name, description, color, parent_id, "
                    "project_id, is_system, enabled) VALUES (:name, :description, "
                    ":color, :parent_id, :project_id, TRUE, :enabled) RETURNING id"
                ),
                {
                    "name": HUMAN,
                    "description": HUMAN_DESCRIPTION,
                    "color": get_next_color(),
                    "parent_id": parent_id,
                    "project_id": project_id,
                    "enabled": enabled,
                },
            ).scalar_one()
            created += 1
        elif human.is_system and human.parent_id == parent_id:
            human_id = human.id
        else:
            print(
                f"Project {project_id} has a code {HUMAN} of its own: skipped, "
                f"its person boxes stay on {PERSON}"
            )
            skipped += 1
            continue

        person = _code(conn, project_id, PERSON)
        if person is None or not person.is_system:
            continue
        moved += conn.execute(
            sa.text(
                "UPDATE bboxannotation SET code_id = :human_id "
                "FROM annotationdocument "
                "WHERE bboxannotation.annotation_document_id = annotationdocument.id "
                "AND annotationdocument.user_id = :system_user_id "
                "AND bboxannotation.code_id = :person_id"
            ),
            {
                "human_id": human_id,
                "person_id": person.id,
                "system_user_id": SYSTEM_USER_ID,
            },
        ).rowcount
    print(
        f"Created the code {HUMAN} in {created} projects, moved {moved} bbox "
        f"annotations of the system user to it, skipped {skipped} projects"
    )


def downgrade() -> None:
    """Move every annotation of the system code HUMAN back to the system code
    PERSON and delete HUMAN (its memos go with it). A project without the
    system code PERSON keeps HUMAN."""
    conn = op.get_bind()
    for project_id, parent_id, _ in _coco_projects(conn):
        human = _code(conn, project_id, HUMAN)
        if human is None or not human.is_system or human.parent_id != parent_id:
            continue
        person = _code(conn, project_id, PERSON)
        if person is None or not person.is_system:
            print(f"Project {project_id} has no system code {PERSON}: keeps {HUMAN}")
            continue
        for table in ("bboxannotation", "spanannotation", "sentenceannotation"):
            for column in ("code_id", "source_code_id"):
                conn.execute(
                    sa.text(
                        f"UPDATE {table} SET {column} = :person_id "
                        f"WHERE {column} = :human_id"
                    ),
                    {"person_id": person.id, "human_id": human.id},
                )
        conn.execute(sa.text("DELETE FROM code WHERE id = :id"), {"id": human.id})
