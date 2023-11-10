from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.project_metadata import ProjectMetadataORM
    from app.core.data.orm.source_document import SourceDocumentORM


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
        UniqueConstraint(
            "source_document_id",
            "project_metadata_id",
            name="UC_unique_metadata_sdoc_id_project_metadata_id",
        ),
    )

    # TODO: we need a constraint to ensure at lest one value is set
