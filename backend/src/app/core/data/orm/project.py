from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.aspect import AspectORM
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.code import CodeORM
    from app.core.data.orm.document_tag import DocumentTagORM
    from app.core.data.orm.folder import FolderORM
    from app.core.data.orm.memo import MemoORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.preprocessing_job import PreprocessingJobORM
    from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM
    from app.core.data.orm.project_metadata import ProjectMetadataORM
    from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
    from app.core.data.orm.source_document import SourceDocumentORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM
    from app.core.data.orm.user import UserORM
    from app.core.data.orm.whiteboard import WhiteboardORM


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
