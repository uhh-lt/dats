from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.artefacts.word_frequencies.word_frequency_orm import WordFrequencyORM
    from core.doc.folder_orm import FolderORM
    from core.doc.source_document_data_orm import SourceDocumentDataORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM
    from modules.perspectives.aspect_orm import AspectORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM
    from modules.perspectives.document_cluster_orm import DocumentClusterORM
    from modules.tag_recommendation.tag_recommendation_orm import (
        TagRecommendationLinkORM,
    )
    from systems.artefact_system.source_document_step_status_orm import (
        SourceDocumentStepStatusORM,
    )


class SourceDocumentORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(
        String(collation="natsort"), nullable=False, index=True
    )
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == ObjectHandleORM.project_id, SourceDocumentORM.id == foreign(ObjectHandleORM.source_document_id))",
    )
    data: Mapped["SourceDocumentDataORM"] = relationship(
        "SourceDocumentDataORM",
        uselist=False,
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == SourceDocumentDataORM.project_id, SourceDocumentORM.id == foreign(SourceDocumentDataORM.id))",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="source_documents"
    )

    folder_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    folder: Mapped["FolderORM"] = relationship(
        "FolderORM",
        back_populates="source_documents",
        primaryjoin="and_(FolderORM.project_id == SourceDocumentORM.project_id, FolderORM.id == foreign(SourceDocumentORM.folder_id))",
    )

    # one to many
    metadata_: Mapped[list["SourceDocumentMetadataORM"]] = relationship(
        "SourceDocumentMetadataORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == SourceDocumentMetadataORM.project_id, SourceDocumentORM.id == foreign(SourceDocumentMetadataORM.source_document_id))",
    )

    annotation_documents: Mapped[list["AnnotationDocumentORM"]] = relationship(
        "AnnotationDocumentORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == AnnotationDocumentORM.project_id, SourceDocumentORM.id == foreign(AnnotationDocumentORM.source_document_id))",
    )

    word_frequencies: Mapped[list["WordFrequencyORM"]] = relationship(
        "WordFrequencyORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == WordFrequencyORM.project_id, SourceDocumentORM.id == foreign(WordFrequencyORM.sdoc_id))",
    )

    # the status of the planned pipeline steps (crud_sdoc_step_status)
    step_statuses: Mapped[list["SourceDocumentStepStatusORM"]] = relationship(
        "SourceDocumentStepStatusORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == SourceDocumentStepStatusORM.project_id, SourceDocumentORM.id == foreign(SourceDocumentStepStatusORM.sdoc_id))",
    )

    tag_recommendation_link: Mapped[list["TagRecommendationLinkORM"]] = relationship(
        "TagRecommendationLinkORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == TagRecommendationLinkORM.project_id, SourceDocumentORM.id == foreign(TagRecommendationLinkORM.source_document_id))",
    )

    # many to many
    tags: Mapped[list["TagORM"]] = relationship(
        "TagORM",
        secondary="SourceDocumentTagLinkTable".lower(),
        back_populates="source_documents",
        viewonly=True,
    )

    document_aspects: Mapped[list["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == DocumentAspectORM.project_id, SourceDocumentORM.id == foreign(DocumentAspectORM.sdoc_id))",
    )
    aspects: Mapped[list["AspectORM"]] = relationship(
        "AspectORM",
        secondary="documentaspect",
        back_populates="source_documents",
        viewonly=True,
    )

    document_clusters: Mapped[list["DocumentClusterORM"]] = relationship(
        "DocumentClusterORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        primaryjoin="and_(SourceDocumentORM.project_id == DocumentClusterORM.project_id, SourceDocumentORM.id == foreign(DocumentClusterORM.sdoc_id))",
    )
    clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM",
        secondary="documentcluster",
        back_populates="source_documents",
        viewonly=True,
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="sourcedocument_pkey"),
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
        ForeignKeyConstraint(
            ["project_id", "folder_id"],
            ["folder.project_id", "folder.id"],
            ondelete="CASCADE",
            name="FK_sourcedocument_folder_id",
        ),
    )
