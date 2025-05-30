from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.topic import TopicORM


class DocumentTopicORM(ORMBase):
    sdoc_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sourcedocument.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    topic_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("topic.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    distance: Mapped[float] = mapped_column(Float, nullable=True)
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
