from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from repos.db.orm_base import ORMBase
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

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.metadata.project_metadata_orm import ProjectMetadataORM


class SourceDocumentMetadataORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    int_value: Mapped[Optional[int]] = mapped_column(Integer)
    str_value: Mapped[Optional[str]] = mapped_column(String)
    boolean_value: Mapped[Optional[bool]] = mapped_column(Boolean)
    date_value: Mapped[Optional[datetime]] = mapped_column(DateTime)
    list_value: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))

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
