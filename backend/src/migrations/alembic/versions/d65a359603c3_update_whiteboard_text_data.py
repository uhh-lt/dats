"""Update whiteboard text data

Revision ID: d65a359603c3
Revises: 408a7ea522aa
Create Date: 2025-05-12 13:04:39.011621

"""

import json
from typing import Sequence

from alembic import op
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, Session, declarative_base, mapped_column

# revision identifiers, used by Alembic.
revision: str = "d65a359603c3"
down_revision: str | None = "408a7ea522aa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

Base = declarative_base()


class Whiteboard(Base):
    __tablename__ = "whiteboard"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(
        String,
        server_default='{"nodes":[],"edges":[]}',
        nullable=False,
        index=False,
    )


def upgrade() -> None:
    # Create a connection to the database
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Get all whiteboards
        whiteboards = session.query(Whiteboard).all()

        for whiteboard in whiteboards:
            updated = False

            try:
                # Parse the JSON content
                content = json.loads(whiteboard.content)

                # Check if there are any nodes
                if "nodes" in content:
                    for node in content["nodes"]:
                        # Check if the node has data
                        if "data" in node:
                            # Check if the node type uses WhiteboardTextData
                            if "type" in node["data"] and node["data"]["type"] in [
                                "text",
                                "note",
                                "border",
                            ]:
                                # Remove variant field if it exists
                                if "variant" in node["data"]:
                                    del node["data"]["variant"]

                                # Add new fields with default values if they don't exist
                                if "strikethrough" not in node["data"]:
                                    node["data"]["strikethrough"] = False

                                if "fontSize" not in node["data"]:
                                    node["data"]["fontSize"] = 16  # Default font size

                                if "fontFamily" not in node["data"]:
                                    node["data"]["fontFamily"] = (
                                        "Arial"  # Default font family
                                    )

                                updated = True

                # If any updates were made, save the updated content
                if updated:
                    whiteboard.content = json.dumps(content)

            except json.JSONDecodeError:
                # Skip invalid JSON content
                print(f"Skipping whiteboard {whiteboard.id} due to invalid JSON")

        # Commit the changes to the database
        session.commit()

    finally:
        session.close()


def downgrade() -> None:
    # Create a connection to the database
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Get all whiteboards
        whiteboards = session.query(Whiteboard).all()

        for whiteboard in whiteboards:
            updated = False

            try:
                # Parse the JSON content
                content = json.loads(whiteboard.content)

                # Check if there are any nodes
                if "nodes" in content:
                    for node in content["nodes"]:
                        # Check if the node has data
                        if "data" in node:
                            # Check if the node type uses WhiteboardTextData
                            if "type" in node["data"] and node["data"]["type"] in [
                                "text",
                                "note",
                                "border",
                            ]:
                                # Add back variant field with a default value
                                if "variant" not in node["data"]:
                                    node["data"]["variant"] = "h1"  # Default variant

                                # Remove the new fields
                                if "strikethrough" in node["data"]:
                                    del node["data"]["strikethrough"]

                                if "fontSize" in node["data"]:
                                    del node["data"]["fontSize"]

                                if "fontFamily" in node["data"]:
                                    del node["data"]["fontFamily"]

                                updated = True

                # If any updates were made, save the updated content
                if updated:
                    whiteboard.content = json.dumps(content)

            except json.JSONDecodeError:
                # Skip invalid JSON content
                print(f"Skipping whiteboard {whiteboard.id} due to invalid JSON")

        # Commit the changes to the database
        session.commit()

    finally:
        session.close()
