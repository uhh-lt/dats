from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.project_metadata import ProjectMetadataORM
    from app.core.data.orm.source_document import SourceDocumentORM


class SourceDocumentMetadataORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    int_value: Mapped[int] = mapped_column(Integer)
    str_value: Mapped[str] = mapped_column(String)
    boolean_value: Mapped[bool] = mapped_column(Boolean)
    date_value: Mapped[datetime] = mapped_column(DateTime)
    list_value: Mapped[List[str]] = mapped_column(ARRAY(String))

    read_only: Mapped[bool] = mapped_column(Boolean, nullable=False, index=True)

    # many to one
    project_metadata_id = Mapped[int] = mapped_column(
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
