from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.code.code_orm import CodeORM
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM


class BBoxAnnotationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    x_min: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    x_max: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    y_min: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    y_max = mapped_column(Integer, nullable=False, index=True)
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
        back_populates="bbox_annotation",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id", ondelete="CASCADE", name="FK_bbox_annotation_project_id"
        ),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="bbox_annotations"
    )

    code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("code.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped["CodeORM"] = relationship("CodeORM", back_populates="bbox_annotations")

    annotation_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="bbox_annotations"
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_bbox_annotation_uuid_unique_per_project",
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

    def get_project_id(self) -> int:
        return self.project_id
