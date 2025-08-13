from datetime import datetime
from typing import TYPE_CHECKING

from repos.db.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.doc.folder_orm import FolderORM
    from core.doc.source_document_data_orm import SourceDocumentDataORM
    from core.doc.source_document_link_orm import SourceDocumentLinkORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM
    from modules.ml.tag_recommendation.tag_recommendation_orm import (
        TagRecommendationLinkORM,
    )
    from modules.perspectives.aspect_orm import AspectORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM
    from modules.perspectives.document_cluster_orm import DocumentClusterORM
    from modules.word_frequency.word_frequency_orm import WordFrequencyORM


class SourceDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # TODO replace this with a virtual column created from sdoc status
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
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    data: Mapped["SourceDocumentDataORM"] = relationship(
        "SourceDocumentDataORM",
        uselist=False,
        cascade="all, delete-orphan",
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

    folder_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("folder.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    folder: Mapped["FolderORM"] = relationship(
        "FolderORM", back_populates="source_documents"
    )

    # one to many
    metadata_: Mapped[list["SourceDocumentMetadataORM"]] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    annotation_documents: Mapped[list["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    source_document_links: Mapped[list["SourceDocumentLinkORM"]] = relationship(
        "SourceDocumentLinkORM",
        back_populates="parent_source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="sourcedocumentlink.c.parent_source_document_id",
    )

    word_frequencies: Mapped[list["WordFrequencyORM"]] = relationship(
        "WordFrequencyORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    tags: Mapped[list["TagORM"]] = relationship(
        "TagORM",
        secondary="SourceDocumentTagLinkTable".lower(),
        back_populates="source_documents",
        passive_deletes=True,
    )

    tag_recommendation_link: Mapped[list["TagRecommendationLinkORM"]] = relationship(
        "TagRecommendationLinkORM",
        back_populates="source_document",
        passive_deletes=True,
    )

    document_aspects: Mapped[list["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
    )
    aspects: Mapped[list["AspectORM"]] = relationship(
        "AspectORM",
        secondary="documentaspect",
        back_populates="source_documents",
        overlaps="document_aspects,aspect,source_document",
    )

    document_clusters: Mapped[list["DocumentClusterORM"]] = relationship(
        "DocumentClusterORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
    )
    clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM",
        secondary="documentcluster",
        back_populates="source_documents",
        overlaps="document_clusters,cluster,source_document",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
