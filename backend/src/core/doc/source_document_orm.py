from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.sdoc_status_enum import SDocStatus
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
    from modules.perspectives.aspect_orm import AspectORM
    from modules.perspectives.cluster_orm import ClusterORM
    from modules.perspectives.document_aspect_orm import DocumentAspectORM
    from modules.perspectives.document_cluster_orm import DocumentClusterORM
    from modules.word_frequency.word_frequency_orm import WordFrequencyORM

# The pipeline step status columns of SourceDocumentORM.
SDOC_STATUS_COLUMNS = [
    # text (1)
    "extract_html",
    # html (10)
    "text_extraction",
    "text_language_detection",
    "text_spacy",
    "text_keywords",
    "text_word_frequency",
    "text_ner",
    "text_es_index",
    "text_sentence_embedding",
    "text_document_embedding",
    "text_html_mapping",
    # image (5)
    "image_caption",
    "image_embedding",
    "image_metadata_extraction",
    "image_thumbnail",
    "image_object_detection",
    # audio (3)
    "audio_metadata",
    "audio_thumbnail",
    "audio_transcription",
    # video (3)
    "video_metadata",
    "video_thumbnail",
    "video_audio_extraction",
]
_ALL_STATUS = ", ".join(SDOC_STATUS_COLUMNS)
# the number of finished steps
_PROCESSED_JOBS_SQL = " + ".join(
    f"(CASE WHEN {c} = {SDocStatus.finished.value} THEN 1 ELSE 0 END)"
    for c in SDOC_STATUS_COLUMNS
)
# the number of planned steps
_TOTAL_JOBS_SQL = " + ".join(
    f"(CASE WHEN {c} IS NULL THEN 0 ELSE 1 END)" for c in SDOC_STATUS_COLUMNS
)
# erroneous if any step is erroneous, processing if any step is processing,
# finished otherwise (also if no step is planned)
_PROCESSED_STATUS_SQL = (
    f"CASE WHEN {SDocStatus.erroneous.value} IN ({_ALL_STATUS}) "
    f"THEN {SDocStatus.erroneous.value} "
    f"WHEN {SDocStatus.processing.value} IN ({_ALL_STATUS}) "
    f"THEN {SDocStatus.processing.value} "
    f"ELSE {SDocStatus.finished.value} END"
)


class SourceDocumentORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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
    )
    data: Mapped["SourceDocumentDataORM"] = relationship(
        "SourceDocumentDataORM",
        uselist=False,
        back_populates="source_document",
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

    tag_recommendation_link: Mapped[list["TagRecommendationLinkORM"]] = relationship(
        "TagRecommendationLinkORM",
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

    document_aspects: Mapped[list["DocumentAspectORM"]] = relationship(
        "DocumentAspectORM",
        back_populates="source_document",
        cascade="all, delete-orphan",
        passive_deletes=True,
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
        passive_deletes=True,
    )
    clusters: Mapped[list["ClusterORM"]] = relationship(
        "ClusterORM",
        secondary="documentcluster",
        back_populates="source_documents",
        overlaps="document_clusters,cluster,source_document",
    )

    # Pipeline step status columns (see SDocStatus), NULL = step not planned.
    # KEEP THE SAME ORDER AS job_type.py and SDOC_STATUS_COLUMNS!

    # TEXT (1)
    extract_html: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)

    # HTML (10)
    text_extraction: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    text_language_detection: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )
    text_spacy: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    text_keywords: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    text_word_frequency: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )
    text_ner: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    text_es_index: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    text_sentence_embedding: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )
    text_document_embedding: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )
    text_html_mapping: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)

    # IMAGE (5)
    image_caption: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    image_embedding: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    image_metadata_extraction: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )
    image_thumbnail: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    image_object_detection: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )

    # AUDIO (3)
    audio_metadata: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    audio_thumbnail: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    audio_transcription: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )

    # VIDEO (3)
    video_metadata: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    video_thumbnail: Mapped[SDocStatus | None] = mapped_column(Integer, deferred=True)
    video_audio_extraction: Mapped[SDocStatus | None] = mapped_column(
        Integer, deferred=True
    )

    # The overall status, derived from the step columns
    processed_jobs: Mapped[int] = mapped_column(
        Integer,
        Computed(_PROCESSED_JOBS_SQL, persisted=True),
        nullable=False,
        index=True,
    )
    total_jobs: Mapped[int] = mapped_column(
        Integer, Computed(_TOTAL_JOBS_SQL, persisted=True), nullable=False
    )
    processed_status: Mapped[int] = mapped_column(
        Integer,
        Computed(_PROCESSED_STATUS_SQL, persisted=True),
        nullable=False,
        index=True,
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
