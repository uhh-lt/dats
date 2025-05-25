from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.source_document import SourceDocumentORM


class DocumentAspectORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # UUID of the embedding (VectorDB)
    embedding_uuid: Mapped[str] = mapped_column(String, nullable=True, index=True)

    # 2D coordinates for visualization
    x: Mapped[float] = mapped_column(Float, nullable=True)
    y: Mapped[float] = mapped_column(Float, nullable=True)

    # many to one
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_aspects",
    )

    aspect_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("aspect.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    aspect: Mapped["AspectORM"] = relationship(
        "AspectORM", back_populates="document_aspects"
    )

    __table_args__ = (UniqueConstraint("sdoc_id", "aspect_id", name="uq_sdoc_aspect"),)

    def __repr__(self) -> str:
        return (
            f"<DocumentAspectORM(sdoc_id={self.sdoc_id}, aspect_id={self.aspect_id})>"
        )
