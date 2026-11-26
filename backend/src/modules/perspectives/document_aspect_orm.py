from typing import TYPE_CHECKING

from sqlalchemy import (
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.aspect_orm import AspectORM


class DocumentAspectORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(Integer, index=True)
    aspect_id: Mapped[int] = mapped_column(Integer, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 2D coordinates for visualization
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)

    # many to one
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_aspects",
        primaryjoin="and_(SourceDocumentORM.project_id == DocumentAspectORM.project_id, SourceDocumentORM.id == foreign(DocumentAspectORM.sdoc_id))",
    )
    aspect: Mapped["AspectORM"] = relationship(
        "AspectORM",
        back_populates="document_aspects",
        primaryjoin="and_(AspectORM.project_id == DocumentAspectORM.project_id, AspectORM.id == foreign(DocumentAspectORM.aspect_id))",
    )

    __table_args__ = (
        PrimaryKeyConstraint(
            "project_id", "sdoc_id", "aspect_id", name="documentaspect_pkey"
        ),
        ForeignKeyConstraint(
            ["project_id", "sdoc_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_documentaspect_sdoc_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "aspect_id"],
            ["aspect.project_id", "aspect.id"],
            ondelete="CASCADE",
            name="FK_documentaspect_aspect_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<DocumentAspectORM(sdoc_id={self.sdoc_id}, aspect_id={self.aspect_id})>"
        )
