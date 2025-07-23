from datetime import datetime
from typing import TYPE_CHECKING, List

from repos.db.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
    from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
    from core.annotation.span_annotation_orm import SpanAnnotationORM
    from core.code.code_orm import CodeORM
    from core.doc.folder_orm import FolderORM
    from core.doc.source_document_orm import SourceDocumentORM
    from core.memo.memo_orm import MemoORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.metadata.project_metadata_orm import ProjectMetadataORM
    from core.tag.document_tag_orm import DocumentTagORM
    from core.user.user_orm import UserORM
    from modules.perspectives.aspect_orm import AspectORM
    from modules.whiteboard.whiteboard_orm import WhiteboardORM
    from preprocessing.preprocessing_job_orm import PreprocessingJobORM
    from preprocessing.preprocessing_job_payload_orm import PreprocessingJobPayloadORM


class ProjectORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # one to many
    codes: Mapped[List["CodeORM"]] = relationship(
        "CodeORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    folders: Mapped[List["FolderORM"]] = relationship(
        "FolderORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    memos: Mapped[List["MemoORM"]] = relationship(
        "MemoORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    document_tags: Mapped[List["DocumentTagORM"]] = relationship(
        "DocumentTagORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    sentence_annotations: Mapped[List["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    bbox_annotations: Mapped[List["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    whiteboards: Mapped[List["WhiteboardORM"]] = relationship(
        "WhiteboardORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    preprocessing_jobs: Mapped[List["PreprocessingJobORM"]] = relationship(
        "PreprocessingJobORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    preprocessing_payloads: Mapped[List["PreprocessingJobPayloadORM"]] = relationship(
        "PreprocessingJobPayloadORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    metadata_: Mapped[List["ProjectMetadataORM"]] = relationship(
        "ProjectMetadataORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    aspects: Mapped[List["AspectORM"]] = relationship(
        "AspectORM",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    users: Mapped[List["UserORM"]] = relationship(
        "UserORM", secondary="ProjectUserLinkTable".lower(), back_populates="projects"
    )


class ProjectUserLinkTable(ORMBase):
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("project.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), primary_key=True
    )
