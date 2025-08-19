"""add quotation codes to existing projects

Revision ID: c970e0892bef
Revises: c970e0892bee
Create Date: 2025-02-26 15:28:35.202746

"""

from typing import Any, Sequence

import sqlalchemy as sa
from alembic import op
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, sessionmaker

from utils.color_utils import get_next_color

# revision identifiers, used by Alembic.
revision: str = "c970e0892bef"
down_revision: str | None = "c970e0892bee"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


class CodeCreate(BaseModel):
    name: str = Field(description="Name of the Code")
    color: str = Field(description="Color of the Code")
    description: str = Field(description="Description of the Code")
    parent_id: int | None = Field(description="Parent of the Code", default=None)
    project_id: int = Field(description="Project the Code belongs to")
    color: str = Field(description="Color of the Code", default_factory=get_next_color)
    is_system: bool = Field(description="Is the Code a system code")


# missing codes
missing_codes = {
    "QUOTATIONS": {
        "desc": "Quotation parts",
        "children": {
            "QUOTE": {
                "desc": "the quotation uttered by the Speaker",
                "children": {
                    "DIRECT": {
                        "desc": "actual words of an utterance, usually in quotation marks"
                    },
                    "INDIRECT": {
                        "desc": "content-wise equivalent utterance using different words, usually part of a sentence together with a Frame"
                    },
                    "REPORTED": {
                        "desc": "report of a speech action, possibly far from the original quote, usually a full sentence, no Frame"
                    },
                    "FREE_INDIRECT": {
                        "desc": "mix of article author & actual speaker, typically construct with 'sollen' (shall) or 'müssen' (must), full sentence"
                    },
                    "INDIRECT_FREE_INDIRECT": {
                        "desc": "content-wise equivalent utterance written in conjunctive mood, full sentence"
                    },
                },
            },
            "SPEAKER": {"desc": "entity in the text that utters the quotation"},
            "CUE": {
                "desc": "words that are part of a Frame and signal a Quote construction"
            },
            "ADDRESSEE": {
                "desc": "entity in the text that the quotation is directed at"
            },
            "FRAME": {
                "desc": "part of a sentence including Cue & Speaker, but not the quotation"
            },
        },
    }
}


def find_system_code_id(db: Session, project_id: int) -> int:
    result = db.execute(
        sa.text(
            """
            SELECT id
            FROM code
            WHERE project_id = :project_id AND name = 'SYSTEM_CODE'
            """
        ),
        {"project_id": project_id},
    )
    return result.scalar()  # type: ignore


def create_code(db: Session, create_dto: CodeCreate) -> int:
    insert_stmt = sa.text("""
        INSERT INTO code (name, color, description, parent_id, project_id, is_system)
        VALUES (:name, :color, :description, :parent_id, :project_id, :is_system)
        RETURNING id
    """)
    result = db.execute(
        insert_stmt,
        {
            "name": create_dto.name,
            "color": create_dto.color,
            "description": create_dto.description,
            "parent_id": create_dto.parent_id,
            "project_id": create_dto.project_id,
            "is_system": create_dto.is_system,
        },
    )
    db.commit()
    return result.scalar()  # type: ignore


def create_codes_recursively(
    db: Session,
    code_dict: dict[str, dict[str, Any]],
    proj_id: int,
    parent_code_id: int | None = None,
):
    for code_name in code_dict.keys():
        create_dto = CodeCreate(
            name=str(code_name),
            color=get_next_color(),
            description=code_dict[code_name]["desc"],
            project_id=proj_id,
            parent_id=parent_code_id,
            is_system=True,
        )

        created_code_id = create_code(db=db, create_dto=create_dto)
        if "children" in code_dict[code_name]:
            create_codes_recursively(
                db=db,
                code_dict=code_dict[code_name]["children"],
                parent_code_id=created_code_id,
                proj_id=proj_id,
            )


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Read all existing project ids
    projects = conn.execute(sa.text("SELECT id FROM project")).fetchall()

    # 2. Create missing quotation codes for each existing project
    db = sessionmaker(bind=conn)()
    for row in projects:
        print(f"Creating missing codes for project {row[0]}")
        system_code_id = find_system_code_id(db=db, project_id=row[0])
        create_codes_recursively(
            db=db,
            code_dict=missing_codes,
            proj_id=row[0],
            parent_code_id=system_code_id,
        )


def downgrade() -> None:
    pass
