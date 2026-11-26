from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.metadata.project_metadata_orm import ProjectMetadataORM


class SourceDocumentMetadataORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)

    int_value: Mapped[int | None] = mapped_column(Integer)
    str_value: Mapped[str | None] = mapped_column(String)
    boolean_value: Mapped[bool | None] = mapped_column(Boolean)
    date_value: Mapped[date | None] = mapped_column(Date)
    list_value: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    project_metadata_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )
    project_metadata: Mapped["ProjectMetadataORM"] = relationship(
        "ProjectMetadataORM",
        back_populates="sdoc_metadata",
        foreign_keys=[project_metadata_id],
    )

    source_document_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="metadata_",
        foreign_keys=[source_document_id],
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="sourcedocumentmetadata_pkey"),
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
        ForeignKeyConstraint(
            ["project_id", "project_metadata_id"],
            ["projectmetadata.project_id", "projectmetadata.id"],
            ondelete="CASCADE",
            name="FK_sourcedocumentmetadata_project_metadata_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "source_document_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_sourcedocumentmetadata_source_document_id",
        ),
    )
