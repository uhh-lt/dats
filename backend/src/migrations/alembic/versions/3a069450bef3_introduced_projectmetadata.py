"""introduced ProjectMetadata

Revision ID: 3a069450bef3
Revises: 28048c9fa4b0
Create Date: 2023-11-27 14:08:57.066581

"""

from datetime import datetime
from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import (
    Mapped,
    Session,
    declarative_base,
    mapped_column,
    relationship,
)

from common.meta_type import MetaType

Base = declarative_base()

# revision identifiers, used by Alembic.
revision: str = "3a069450bef3"
down_revision: str | None = "28048c9fa4b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


class Project(Base):
    __tablename__ = "project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_documents: Mapped[list["SourceDocument"]] = relationship(
        "SourceDocument", back_populates="project", passive_deletes=True
    )
    metadata_: Mapped[list["ProjectMetadata"]] = relationship(
        "ProjectMetadata",
        back_populates="project",
        passive_deletes=True,
    )


class SourceDocument(Base):
    __tablename__ = "sourcedocument"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["Project"] = relationship(
        "Project", back_populates="source_documents"
    )

    # one to many
    metadata_: Mapped[list["SourceDocumentMetadata"]] = relationship(
        "SourceDocumentMetadata",
        back_populates="source_document",
        passive_deletes=True,
    )


class ProjectMetadata(Base):
    __tablename__ = "projectmetadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String, nullable=False, index=False)
    metatype: Mapped[str] = mapped_column(String, nullable=False, index=False)
    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, index=False)
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=False)

    # one to many
    sdoc_metadata: Mapped[list["SourceDocumentMetadata"]] = relationship(
        "SourceDocumentMetadata",
        back_populates="project_metadata",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["Project"] = relationship("Project", back_populates="metadata_")

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "key",
            "doctype",
            name="UC_unique_metadata_key_doctype_per_project",
        ),
    )


class SourceDocumentMetadata(Base):
    __tablename__ = "sourcedocumentmetadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # old fields
    key: Mapped[str] = mapped_column(String, nullable=False, index=True)
    value: Mapped[str] = mapped_column(String, index=False)
    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)

    # new fields
    int_value: Mapped[int | None] = mapped_column(Integer)
    str_value: Mapped[str | None] = mapped_column(String)
    boolean_value: Mapped[bool | None] = mapped_column(Boolean)
    date_value: Mapped[datetime | None] = mapped_column(DateTime)
    list_value: Mapped[list[str | None]] = mapped_column(ARRAY(String))

    # many to one
    project_metadata_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projectmetadata.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_metadata: Mapped["ProjectMetadata"] = relationship(
        "ProjectMetadata", back_populates="sdoc_metadata"
    )

    # many to one
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocument"] = relationship(
        "SourceDocument", back_populates="metadata_"
    )

    __table_args__ = (
        # CHECK constraint that asserts that exactly one of the values is NOT NULL
        CheckConstraint(
            """(
                        CASE WHEN int_value IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN str_value IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN boolean_value IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN date_value IS NULL THEN 0 ELSE 1 END
                        + CASE WHEN list_value IS NULL THEN 0 ELSE 1 END
                    ) = 1
                    """,
            name="CC_source_document_metadata_has_exactly_one_value",
        ),
        UniqueConstraint(
            "source_document_id",
            "project_metadata_id",
            name="UC_unique_metadata_sdoc_id_project_metadata_id",
        ),
    )


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)

    # create the ProjectMetadata table
    ProjectMetadata.__table__.create(bind=bind)

    # modify the existing SourceDocumentMetadata table
    op.add_column(
        "sourcedocumentmetadata", sa.Column("int_value", sa.Integer(), nullable=True)
    )
    op.add_column(
        "sourcedocumentmetadata", sa.Column("str_value", sa.String(), nullable=True)
    )
    op.add_column(
        "sourcedocumentmetadata",
        sa.Column("boolean_value", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "sourcedocumentmetadata", sa.Column("date_value", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "sourcedocumentmetadata",
        sa.Column("list_value", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column(
        "sourcedocumentmetadata",
        sa.Column("project_metadata_id", sa.Integer(), nullable=True),
    )
    op.drop_constraint(
        "UC_unique_metadata_key_per_sdoc", "sourcedocumentmetadata", type_="unique"
    )
    op.drop_index("ix_sourcedocumentmetadata_key", table_name="sourcedocumentmetadata")
    op.drop_index(
        "ix_sourcedocumentmetadata_read_only", table_name="sourcedocumentmetadata"
    )
    op.create_unique_constraint(
        "UC_unique_metadata_sdoc_id_project_metadata_id",
        "sourcedocumentmetadata",
        ["source_document_id", "project_metadata_id"],
    )
    op.create_index(
        op.f("ix_sourcedocumentmetadata_project_metadata_id"),
        "sourcedocumentmetadata",
        ["project_metadata_id"],
        unique=False,
    )
    op.create_foreign_key(
        "sourcedocumentmetadata_project_metadata_id_fkey",
        "sourcedocumentmetadata",
        "projectmetadata",
        ["project_metadata_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # migrate the data
    def get_or_create_project_metadata(
        key: str, doctype: str, read_only: bool, project_id: int
    ) -> ProjectMetadata:
        project_metadata = (
            session.query(ProjectMetadata)
            .filter(
                ProjectMetadata.key == key,
                ProjectMetadata.doctype == doctype,
                ProjectMetadata.project_id == project_id,
            )
            .one_or_none()
        )
        if project_metadata is None:
            project_metadata = ProjectMetadata(
                key=key,
                metatype=MetaType.STRING,
                read_only=read_only,
                doctype=doctype,
                project_id=project_id,
            )
            session.add(project_metadata)
            session.flush()
        return project_metadata

    for sdoc_metadata in session.query(SourceDocumentMetadata).all():
        project_metadata = get_or_create_project_metadata(
            key=sdoc_metadata.key,
            doctype=sdoc_metadata.source_document.doctype,
            read_only=sdoc_metadata.read_only,
            project_id=sdoc_metadata.source_document.project_id,
        )
        sdoc_metadata.project_metadata_id = project_metadata.id
        sdoc_metadata.str_value = sdoc_metadata.value
        session.add(sdoc_metadata)

    session.flush()

    # make project_metadata_id not nullable
    op.alter_column(
        "sourcedocumentmetadata",
        "project_metadata_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    # remove old columns
    op.drop_column("sourcedocumentmetadata", "read_only")
    op.drop_column("sourcedocumentmetadata", "value")
    op.drop_column("sourcedocumentmetadata", "key")


def downgrade() -> None:
    pass
    # TODO: implement downgrade
