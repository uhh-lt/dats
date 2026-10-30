"""migrate assistant users to virtual annotators

The global assistant users (zero-shot 9990, few-shot 9991, trained 9992) become
virtual annotators of every project that has data of them: their annotation
documents (with all annotations), memos, memos about them, the provenance of
annotations copied from them and the user filters of saved analyses and search
views move to the new virtual annotator of the respective project. Afterwards,
the global assistant users are deleted.

Revision ID: 5aba4c95cf5f
Revises: de97bf149233
Create Date: 2026-10-30 11:16:23.117880

"""

from typing import Any, Sequence

import sqlalchemy as sa
from alembic import op
from loguru import logger
from sqlalchemy.engine import Connection

# revision identifiers, used by Alembic.
revision: str = "5aba4c95cf5f"
down_revision: str | None = "de97bf149233"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The global assistant users and the names of their virtual annotators, frozen at
# the time of this migration.
ASSISTANT_USERS: list[tuple[int, str]] = [
    (9990, "Assistant (zero-shot)"),
    (9991, "Assistant (few-shot)"),
    (9992, "Assistant (trained)"),
]

# The projects with data of an assistant user: annotations (via the annotation
# documents), memos written by it or about it, and annotations copied from it.
PROJECTS_WITH_DATA_SQL = """
SELECT sd.project_id
FROM annotationdocument ad
JOIN sourcedocument sd ON sd.id = ad.source_document_id
WHERE ad.user_id = :user_id
UNION
SELECT m.project_id FROM memo m WHERE m.user_id = :user_id
UNION
SELECT m.project_id
FROM memo m
JOIN objecthandle oh ON oh.id = m.attached_to_id
WHERE oh.user_id = :user_id
UNION
SELECT project_id FROM spanannotation WHERE source_user_id = :user_id
UNION
SELECT project_id FROM sentenceannotation WHERE source_user_id = :user_id
UNION
SELECT project_id FROM bboxannotation WHERE source_user_id = :user_id
ORDER BY 1
"""


def upgrade() -> None:
    conn = op.get_bind()
    for user_id, name in ASSISTANT_USERS:
        project_ids = (
            conn.execute(sa.text(PROJECTS_WITH_DATA_SQL), {"user_id": user_id})
            .scalars()
            .all()
        )
        for project_id in project_ids:
            new_user_id = _create_virtual_annotator(
                conn, project_id=project_id, name=name
            )
            _move_project_data(
                conn,
                project_id=project_id,
                old_user_id=user_id,
                new_user_id=new_user_id,
            )
            _remap_user_filters(
                conn,
                project_id=project_id,
                old_user_id=user_id,
                new_user_id=new_user_id,
            )
            logger.info(
                f"Moved the data of assistant user {user_id} in project "
                f"{project_id} to the virtual annotator '{name}' ({new_user_id})."
            )

        # Everything of the global user moved, the rest (memberships, tokens,
        # favorites, search views) goes with it; prompt template versions it
        # wrote keep a NULL author.
        conn.execute(sa.text('DELETE FROM "user" WHERE id = :id'), {"id": user_id})


def downgrade() -> None:
    # The global assistant users would have to be recreated with credentials from
    # the config; their data stays with the virtual annotators.
    pass


def _create_virtual_annotator(conn: Connection, *, project_id: int, name: str) -> int:
    return conn.execute(
        sa.text(
            'INSERT INTO "user" (kind, project_id, first_name, last_name) '
            "VALUES ('virtual', :project_id, :name, '') RETURNING id"
        ),
        {"project_id": project_id, "name": name},
    ).scalar_one()


def _move_project_data(
    conn: Connection, *, project_id: int, old_user_id: int, new_user_id: int
) -> None:
    params = {"project_id": project_id, "old": old_user_id, "new": new_user_id}

    # 1) annotation documents, with all their annotations and span groups
    conn.execute(
        sa.text(
            "UPDATE annotationdocument SET user_id = :new "
            "WHERE user_id = :old AND source_document_id IN "
            "(SELECT id FROM sourcedocument WHERE project_id = :project_id)"
        ),
        params,
    )

    # 2) memos written by the assistant
    conn.execute(
        sa.text(
            "UPDATE memo SET user_id = :new "
            "WHERE user_id = :old AND project_id = :project_id"
        ),
        params,
    )

    # 3) memos about the assistant are attached to its object handle
    old_handle_id = conn.execute(
        sa.text("SELECT id FROM objecthandle WHERE user_id = :old"), params
    ).scalar_one_or_none()
    if old_handle_id is not None:
        has_memos = conn.execute(
            sa.text(
                "SELECT EXISTS (SELECT 1 FROM memo WHERE attached_to_id = :handle "
                "AND project_id = :project_id)"
            ),
            {"handle": old_handle_id, "project_id": project_id},
        ).scalar_one()
        if has_memos:
            new_handle_id = conn.execute(
                sa.text(
                    "INSERT INTO objecthandle (user_id) VALUES (:new) RETURNING id"
                ),
                params,
            ).scalar_one()
            conn.execute(
                sa.text(
                    "UPDATE memo SET attached_to_id = :new_handle "
                    "WHERE attached_to_id = :old_handle AND project_id = :project_id"
                ),
                {
                    "new_handle": new_handle_id,
                    "old_handle": old_handle_id,
                    "project_id": project_id,
                },
            )

    # 4) provenance of the annotations copied from the assistant
    for table in ("spanannotation", "sentenceannotation", "bboxannotation"):
        conn.execute(
            sa.text(
                f"UPDATE {table} SET source_user_id = :new "
                "WHERE source_user_id = :old AND project_id = :project_id"
            ),
            params,
        )


def _remap_user_filters(
    conn: Connection, *, project_id: int, old_user_id: int, new_user_id: int
) -> None:
    """Saved filters on a user column (e.g. timeline analysis concepts, search
    views) that select the assistant select its virtual annotator instead."""
    for table, column in (("timelineanalysis", "concepts"), ("searchview", "filters")):
        rows = conn.execute(
            sa.text(f"SELECT id, {column} FROM {table} WHERE project_id = :project_id"),
            {"project_id": project_id},
        ).all()
        for row_id, value in rows:
            remapped, changed = _remap_filter_values(value, old_user_id, new_user_id)
            if not changed:
                continue
            conn.execute(
                sa.text(
                    f"UPDATE {table} SET {column} = :value WHERE id = :id"
                ).bindparams(sa.bindparam("value", type_=sa.JSON)),
                {"value": remapped, "id": row_id},
            )


def _remap_filter_values(value: Any, old_id: int, new_id: int) -> tuple[Any, bool]:
    """Replace the user id in every filter expression on a user column
    (`*USER_ID*`) of a JSON value. Returns the new value and whether it changed."""
    if isinstance(value, list):
        results = [_remap_filter_values(item, old_id, new_id) for item in value]
        return [item for item, _ in results], any(changed for _, changed in results)
    if not isinstance(value, dict):
        return value, False

    changed = False
    result: dict[str, Any] = {}
    for key, item in value.items():
        result[key], item_changed = _remap_filter_values(item, old_id, new_id)
        changed = changed or item_changed
    column = value.get("column")
    if isinstance(column, str) and "USER_ID" in column and "value" in value:
        filter_value = value["value"]
        if filter_value == old_id:
            result["value"] = new_id
            changed = True
        elif isinstance(filter_value, list) and old_id in filter_value:
            result["value"] = [new_id if v == old_id else v for v in filter_value]
            changed = True
    return result, changed
