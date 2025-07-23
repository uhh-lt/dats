from typing import TYPE_CHECKING

from repos.db.orm_base import ORMBase
from sqlalchemy import Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from modules.perspectives.aspect_orm import AspectORM


class DocumentAspectORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    aspect_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("aspect.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 2D coordinates for visualization
    x: Mapped[float] = mapped_column(Float, nullable=True)
    y: Mapped[float] = mapped_column(Float, nullable=True)

    # many to one
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_aspects",
    )
    aspect: Mapped["AspectORM"] = relationship(
        "AspectORM", back_populates="document_aspects"
    )

    def __repr__(self) -> str:
        return (
            f"<DocumentAspectORM(sdoc_id={self.sdoc_id}, aspect_id={self.aspect_id})>"
        )
