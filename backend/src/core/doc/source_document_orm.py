from datetime import datetime
from typing import TYPE_CHECKING

from common.doc_type import DocType
from common.sdoc_status_enum import SDocStatus
from repos.db.orm_base import ORMBase
from sqlalchemy import (
    Boolean,
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    case,
    func,
)
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

    # KEEP THE SAME ORDER AS job_type.py!

    # INIT
    sdoc_init: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    extract_archive: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    pdf_checking: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    extract_html: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )

    # HTML
    text_extraction: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    text_language_detection: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    text_spacy: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    text_es_index: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    text_sentence_embedding: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    text_html_mapping: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )

    # IMAGE
    image_caption: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    image_embedding: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    image_metadata_extraction: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    image_thumbnail: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    image_object_detection: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )

    # AUDIO
    audio_metadata: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    audio_thumbnail: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    audio_transcription: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )

    # VIDEO
    video_metadata: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    video_thumbnail: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )
    video_audio_extraction: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
        deferred=True,
        deferred_raiseload=True,
    )

    processed: Mapped[bool] = mapped_column(
        Computed(
            case(
                (
                    doctype == DocType.text,
                    case(
                        (
                            sdoc_init
                            & extract_html
                            & text_extraction
                            & text_es_index
                            & text_html_mapping
                            & text_language_detection
                            & text_spacy
                            & text_sentence_embedding,
                            True,
                        ),
                        else_=False,
                    ),
                ),
                (
                    doctype == DocType.image,
                    case(
                        (
                            sdoc_init
                            & text_extraction
                            & text_es_index
                            & text_html_mapping
                            & text_language_detection
                            & text_spacy
                            & text_sentence_embedding
                            & image_caption
                            & image_embedding
                            & image_metadata_extraction
                            & image_object_detection
                            & image_thumbnail,
                            True,
                        ),
                        else_=False,
                    ),
                ),
                (
                    doctype == DocType.audio,
                    case(
                        (
                            sdoc_init
                            & text_extraction
                            & text_es_index
                            & text_html_mapping
                            & text_language_detection
                            & text_spacy
                            & text_sentence_embedding
                            & audio_metadata
                            & audio_thumbnail
                            & audio_transcription,
                            True,
                        ),
                        else_=False,
                    ),
                ),
                (
                    doctype == DocType.video,
                    case(
                        (
                            sdoc_init
                            & text_extraction
                            & text_es_index
                            & text_html_mapping
                            & text_language_detection
                            & text_spacy
                            & text_sentence_embedding
                            & audio_transcription
                            & video_audio_extraction
                            & video_metadata
                            & video_thumbnail,
                            True,
                        ),
                        else_=False,
                    ),
                ),
                else_=False,
            ),
            persisted=True,
        ),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id", "filename", name="UC_unique_filename_in_project"
        ),
    )

    def get_project_id(self) -> int:
        return self.project_id
