"""Update whiteboard edge label data

Revision ID: 42c759c92f5b
Revises: d65a359603c3
Create Date: 2025-05-12 13:21:59.222409

"""

import json
from typing import Sequence, Union

from alembic import op
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, Session, declarative_base, mapped_column

# revision identifiers, used by Alembic.
revision: str = "42c759c92f5b"
down_revision: Union[str, None] = "d65a359603c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

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

                # Check if there are any edges
                if "edges" in content:
                    for edge in content["edges"]:
                        # Check if the edge has data
                        if "data" in edge and edge["data"] is not None:
                            # Check if the edge data has label
                            if "label" in edge["data"]:
                                # Edge label also uses WhiteboardTextData fields
                                label = edge["data"]["label"]

                                # Remove variant field if it exists
                                if "variant" in label:
                                    del label["variant"]

                                # Add new fields with default values if they don't exist
                                if "strikethrough" not in label:
                                    label["strikethrough"] = False

                                if "fontSize" not in label:
                                    label["fontSize"] = (
                                        12  # Default font size for edge labels (smaller than nodes)
                                    )

                                if "fontFamily" not in label:
                                    label["fontFamily"] = "Arial"  # Default font family

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

                # Check if there are any edges
                if "edges" in content:
                    for edge in content["edges"]:
                        # Check if the edge has data
                        if "data" in edge and edge["data"] is not None:
                            # Check if the edge data has label
                            if "label" in edge["data"]:
                                # Edge label also uses WhiteboardTextData fields
                                label = edge["data"]["label"]

                                # Add back variant field with a default value
                                if "variant" not in label:
                                    label["variant"] = "h1"  # Default variant

                                # Remove the new fields
                                if "strikethrough" in label:
                                    del label["strikethrough"]

                                if "fontSize" in label:
                                    del label["fontSize"]

                                if "fontFamily" in label:
                                    del label["fontFamily"]

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
