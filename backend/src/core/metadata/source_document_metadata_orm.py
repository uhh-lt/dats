from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
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
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    int_value: Mapped[int | None] = mapped_column(Integer)
    str_value: Mapped[str | None] = mapped_column(String)
    boolean_value: Mapped[bool | None] = mapped_column(Boolean)
    date_value: Mapped[datetime | None] = mapped_column(DateTime)
    list_value: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    # many to one
    project_metadata_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projectmetadata.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_metadata: Mapped["ProjectMetadataORM"] = relationship(
        "ProjectMetadataORM", back_populates="sdoc_metadata"
    )

    # many to one
    source_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM", back_populates="metadata_"
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

    def get_project_id(self) -> int:
        return self.project_metadata.get_project_id()
