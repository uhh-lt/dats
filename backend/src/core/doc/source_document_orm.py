from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    case,
    func,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus
from modules.doc_processing.doc_processing_steps import PROCESSING_JOBS
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.doc.folder_orm import FolderORM
    from core.doc.source_document_data_orm import SourceDocumentDataORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
    from core.project.project_orm import ProjectORM
    from core.tag.tag_orm import TagORM
    from modules.ml.tag_recommendation.tag_recommendation_orm import (
        TagRecommendationLinkORM,
    )
    from modules.perspectives.aspect.aspect_orm import AspectORM
    from modules.perspectives.cluster.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect.document_aspect_orm import (
        DocumentAspectORM,
    )
    from modules.perspectives.document_cluster.document_cluster_orm import (
        DocumentClusterORM,
    )
    from modules.word_frequency.word_frequency_orm import WordFrequencyORM


class SourceDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(
        String(collation="natsort"), nullable=False, index=True
    )
    doctype: Mapped[str] = mapped_column(String, nullable=False, index=True)
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

    # KEEP THE SAME ORDER AS job_type.py!

    # TEXT (1)
    extract_html: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )

    # HTML (6)
    text_extraction: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    text_language_detection: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    text_spacy: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    text_es_index: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    text_sentence_embedding: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    text_html_mapping: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )

    # IMAGE (5)
    image_caption: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    image_embedding: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    image_metadata_extraction: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    image_thumbnail: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    image_object_detection: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )

    # AUDIO (3)
    audio_metadata: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    audio_thumbnail: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    audio_transcription: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )

    # VIDEO (3)
    video_metadata: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    video_thumbnail: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )
    video_audio_extraction: Mapped[SDocStatus] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
        deferred=True,
    )

    processed_jobs: Mapped[int] = mapped_column(
        Computed(
            # text (1)
            extract_html
            # html (6)
            + text_extraction
            + text_language_detection
            + text_spacy
            + text_es_index
            + text_sentence_embedding
            + text_html_mapping
            # image (5)
            + image_caption
            + image_embedding
            + image_metadata_extraction
            + image_thumbnail
            + image_object_detection
            # audio (3)
            + audio_metadata
            + audio_thumbnail
            + audio_transcription
            # video (3)
            + video_metadata
            + video_thumbnail
            + video_audio_extraction,
            persisted=True,
        ),
        nullable=False,
        index=True,
    )

    @property
    def total_jobs(self) -> int:
        return len(PROCESSING_JOBS[DocType(self.doctype)])

    @hybrid_property
    def processed_status(self) -> SDocStatus:  # type: ignore
        if self.processed_jobs < 0:
            return SDocStatus.erroneous
        elif self.processed_jobs == len(PROCESSING_JOBS[DocType(self.doctype)]):
            return SDocStatus.finished
        else:
            return SDocStatus.processing

    @processed_status.expression
    def processed_status(cls):
        return case(
            (
                cls.processed_jobs < 0,
                SDocStatus.erroneous,
            ),  # type: ignore
            (
                (cls.doctype == DocType.text)
                & (cls.processed_jobs == len(PROCESSING_JOBS[DocType.text])),
                SDocStatus.finished,
            ),  # type: ignore
            (
                (cls.doctype == DocType.image)
                & (cls.processed_jobs == len(PROCESSING_JOBS[DocType.image])),
                SDocStatus.finished,
            ),  # type: ignore
            (
                (cls.doctype == DocType.audio)
                & (cls.processed_jobs == len(PROCESSING_JOBS[DocType.audio])),
                SDocStatus.finished,
            ),  # type: ignore
            (
                (cls.doctype == DocType.video)
                & (cls.processed_jobs == len(PROCESSING_JOBS[DocType.video])),
                SDocStatus.finished,
            ),  # type: ignore
            else_=SDocStatus.processing,
        )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
