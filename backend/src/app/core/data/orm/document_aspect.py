from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.source_document import SourceDocumentORM

DOCUMENT_EMBEDDING_SIZE = 1024


class DocumentAspectORM(ORMBase):
    # Composite primary key
    sdoc_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("source_document.id", ondelete="CASCADE"), primary_key=True
    )
    aspect_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("aspect.id", ondelete="CASCADE"), primary_key=True
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # embeddings
    og_embedding = mapped_column(Vector(DOCUMENT_EMBEDDING_SIZE), nullable=True)
    embedding = mapped_column(Vector(DOCUMENT_EMBEDDING_SIZE), nullable=True)

    # 2D coordinates for visualization
    og_x: Mapped[float] = mapped_column(Float, nullable=True)
    og_y: Mapped[float] = mapped_column(Float, nullable=True)
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
