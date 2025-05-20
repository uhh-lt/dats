from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.topic import TopicORM


class DocumentTopicORM(ORMBase):
    # Composite primary key
    sdoc_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("source_document.id", ondelete="CASCADE"), primary_key=True
    )
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topic.id", ondelete="CASCADE"), primary_key=True
    )

    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # many to one
    source_document: Mapped["SourceDocumentORM"] = relationship(
        "SourceDocumentORM",
        back_populates="document_topics",
    )
    topic: Mapped["TopicORM"] = relationship(
        "TopicORM",
        back_populates="document_topics",
    )

    def __repr__(self) -> str:
        return f"<DocumentTopicORM(sdoc_id={self.sdoc_id}, topic_id={self.topic_id}, is_accepted={self.is_accepted})>"
