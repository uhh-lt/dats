from typing import TYPE_CHECKING

from sqlalchemy import (
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.aspect_orm import AspectORM


class DocumentAspectORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    aspect_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 2D coordinates for visualization
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)

    # many to one
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_aspects",
        foreign_keys=[sdoc_id],
    )
    aspect: Mapped["AspectORM"] = relationship(
        "AspectORM",
        back_populates="document_aspects",
        foreign_keys=[aspect_id],
    )

    __table_args__ = (
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
