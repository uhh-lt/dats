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
    from core.code.code_orm import CodeORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM


class BBoxAnnotationORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    x_min: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    x_max: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    y_min: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    y_max: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
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
        back_populates="bbox_annotation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="ObjectHandleORM.bbox_annotation_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id", ondelete="CASCADE", name="FK_bbox_annotation_project_id"
        ),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="bbox_annotations"
    )

    code_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    code: Mapped["CodeORM"] = relationship(
        "CodeORM",
        back_populates="bbox_annotations",
        foreign_keys="bboxannotation.c.code_id",
    )

    annotation_document_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM",
        back_populates="bbox_annotations",
        foreign_keys=[annotation_document_id],
    )

    # provenance: set when the annotation was copied from another annotation
    # (e.g. accepted in the annotation comparison); SET NULL keeps the record
    # when the source annotation, its user or its code is deleted
    source_annotation_id: Mapped[int | None] = mapped_column(Integer, index=True)
    source_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "user.id",
            ondelete="SET NULL",
            name="FK_bbox_annotation_source_user_id",
        ),
        index=True,
    )
    source_code_id: Mapped[int | None] = mapped_column(Integer, index=True)

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="bboxannotation_pkey"),
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_bbox_annotation_uuid_unique_per_project",
        ),
        ForeignKeyConstraint(
            ["project_id", "code_id"],
            ["code.project_id", "code.id"],
            ondelete="CASCADE",
            name="FK_bboxannotation_code_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "annotation_document_id"],
            ["annotationdocument.project_id", "annotationdocument.id"],
            ondelete="CASCADE",
            name="FK_bboxannotation_annotation_document_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "source_annotation_id"],
            ["bboxannotation.project_id", "bboxannotation.id"],
            ondelete="SET NULL (source_annotation_id)",
            name="FK_bboxannotation_source_annotation_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "source_code_id"],
            ["code.project_id", "code.id"],
            ondelete="SET NULL (source_code_id)",
            name="FK_bboxannotation_source_code_id",
        ),
    )

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]
