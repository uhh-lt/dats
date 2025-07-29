"""add type to whiteboard node data

Revision ID: 408a7ea522aa
Revises: dda4423e30a2
Create Date: 2025-04-17 10:13:19.053366

"""

import json
from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import Session

# revision identifiers, used by Alembic.
revision: str = "408a7ea522aa"
down_revision: str | None = "dda4423e30a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create a connection to bind for using execute
    connection = op.get_bind()
    session = Session(bind=connection)

    # Get all whiteboards
    whiteboards = connection.execute(
        sa.text("SELECT id, content FROM whiteboard")
    ).fetchall()

    # Process each whiteboard
    for whiteboard_id, content_str in whiteboards:
        if not content_str:
            continue

        try:
            # Load the content JSON
            content = json.loads(content_str)

            # Flag to track if we made changes
            modified = False

            # Loop through nodes
            if "nodes" in content:
                for node in content["nodes"]:
                    # Check if node has data field
                    if "data" in node and isinstance(node["data"], dict):
                        # Check if node has type but data doesn't have the type field
                        if "type" in node and (
                            "type" not in node["data"]
                            or node["data"]["type"] != node["type"]
                        ):
                            # Add the type to node data
                            node["data"]["type"] = node["type"]
                            modified = True

            # Update the whiteboard if modified
            if modified:
                updated_content = json.dumps(content)
                connection.execute(
                    sa.text("UPDATE whiteboard SET content = :content WHERE id = :id"),
                    {"content": updated_content, "id": whiteboard_id},
                )

        except Exception as e:
            print(f"Error processing whiteboard {whiteboard_id}: {e}")

    # Commit changes
    session.commit()


def downgrade() -> None:
    # Create a connection to bind for using execute
    connection = op.get_bind()
    session = Session(bind=connection)

    # Get all whiteboards
    whiteboards = connection.execute(
        sa.text("SELECT id, content FROM whiteboard")
    ).fetchall()

    # Process each whiteboard
    for whiteboard_id, content_str in whiteboards:
        if not content_str:
            continue

        try:
            # Load the content JSON
            content = json.loads(content_str)

            # Flag to track if we made changes
            modified = False

            # Loop through nodes
            if "nodes" in content:
                for node in content["nodes"]:
                    # Check if node has data field and type field in data
                    if (
                        "data" in node
                        and isinstance(node["data"], dict)
                        and "type" in node["data"]
                    ):
                        # Remove the type field from data
                        del node["data"]["type"]
                        modified = True

            # Update the whiteboard if modified
            if modified:
                updated_content = json.dumps(content)
                connection.execute(
                    sa.text("UPDATE whiteboard SET content = :content WHERE id = :id"),
                    {"content": updated_content, "id": whiteboard_id},
                )

        except Exception as e:
            print(f"Error processing whiteboard {whiteboard_id}: {e}")

    # Commit changes
    session.commit()
