from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.source_document import SourceDocumentORM


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
