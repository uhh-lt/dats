from typing import TYPE_CHECKING, List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.document_topic import DocumentTopicORM
    from app.core.data.orm.source_document import SourceDocumentORM


EMBEDDING_SIZE = 1024  # Define the embedding size for the topic embedding


class TopicORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    top_words: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    top_word_scores: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(Float), nullable=True
    )
    level: Mapped[int] = mapped_column(Integer)
    color: Mapped[str] = mapped_column(String, nullable=False)
    top_docs: Mapped[Optional[List[int]]] = mapped_column(ARRAY(Integer), nullable=True)
    topic_embedding = mapped_column(Vector(EMBEDDING_SIZE), nullable=True)

    # many to one
    parent_topic_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("topic.id", ondelete="SET NULL"), nullable=True, index=True
    )
    parent_topic: Mapped[Optional["TopicORM"]] = relationship(
        "TopicORM", remote_side=[id], back_populates="child_topics"
    )
    child_topics: Mapped[List["TopicORM"]] = relationship(
        "TopicORM", back_populates="parent_topic"
    )

    aspect_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("aspect.id", ondelete="CASCADE"), nullable=False, index=True
    )
    aspect: Mapped["AspectORM"] = relationship("AspectORM", back_populates="topics")

    # many to many with SourceDocument through DocumentTopicORM
    document_topics: Mapped[List["DocumentTopicORM"]] = relationship(
        "DocumentTopicORM", back_populates="topic", cascade="all, delete-orphan"
    )

    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="documenttopic",
        back_populates="topics",
    )

    def __repr__(self) -> str:
        return f"<TopicORM(id={self.id}, name='{self.name}')>"
