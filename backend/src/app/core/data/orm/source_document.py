from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.document_aspect import DocumentAspectORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.document_tag_recommendation import (
        DocumentTagRecommendationLinkORM,
    )
    from app.core.data.orm.document_topic import DocumentTopicORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document_data import SourceDocumentDataORM
    from app.core.data.orm.source_document_link import SourceDocumentLinkORM
    from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
    from app.core.data.orm.topic import TopicORM
    from app.core.data.orm.word_frequency import WordFrequencyORM


class SourceDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="source_document",
        passive_deletes=True,
    )
    data: Mapped["SourceDocumentDataORM"] = relationship(
        "SourceDocumentDataORM",
        uselist=False,
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="source_documents"
    )

    # one to many
    metadata_: Mapped[List["SourceDocumentMetadataORM"]] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="source_document",
        passive_deletes=True,
    )

    annotation_documents: Mapped[List["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM", back_populates="source_document", passive_deletes=True
    )

    source_document_links: Mapped[List["SourceDocumentLinkORM"]] = relationship(
        "SourceDocumentLinkORM",
        back_populates="parent_source_document",
        passive_deletes=True,
        foreign_keys="sourcedocumentlink.c.parent_source_document_id",
    )

    word_frequencies: Mapped[List["WordFrequencyORM"]] = relationship(
        "WordFrequencyORM",
        back_populates="source_document",
        passive_deletes=True,
    )

    # many to many
    document_tags: Mapped[List["DocumentTagORM"]] = relationship(
        "DocumentTagORM",
        secondary="SourceDocumentDocumentTagLinkTable".lower(),
        back_populates="source_documents",
        passive_deletes=True,
    )

    document_tag_recommendation_link: Mapped[
        List["DocumentTagRecommendationLinkORM"]
    ] = relationship(
        "DocumentTagRecommendationLinkORM",
        back_populates="source_document",
        passive_deletes=True,
    )

    document_aspects: Mapped[List["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
    )
    aspects: Mapped[List["AspectORM"]] = relationship(
        "AspectORM",
        secondary="documentaspect",
        back_populates="source_documents",
        overlaps="document_aspects,aspect,source_document",
    )

    document_topics: Mapped[List["DocumentTopicORM"]] = relationship(
        "DocumentTopicORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
    )
    topics: Mapped[List["TopicORM"]] = relationship(
        "TopicORM",
        secondary="documenttopic",
        back_populates="source_documents",
        overlaps="document_topics,topic,source_document",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )
