from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.annotation_document_orm import AnnotationDocumentORM
    from core.annotation.span_group_orm import SpanGroupORM
    from core.annotation.span_text_orm import SpanTextORM
    from core.code.code_orm import CodeORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM


class SpanAnnotationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    begin: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    end: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    begin_token: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    end_token: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
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
        back_populates="span_annotation",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id", ondelete="CASCADE", name="FK_span_annotation_project_id"
        ),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="span_annotations"
    )

    code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("code.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped["CodeORM"] = relationship("CodeORM", back_populates="span_annotations")

    annotation_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="span_annotations"
    )

    span_text_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("spantext.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    span_text: Mapped["SpanTextORM"] = relationship(
        "SpanTextORM", back_populates="span_annotations"
    )

    # many to many
    span_groups: Mapped[list["SpanGroupORM"]] = relationship(
        "SpanGroupORM",
        secondary="SpanAnnotationSpanGroupLinkTable".lower(),
        back_populates="span_annotations",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_span_annotation_uuid_unique_per_project",
        ),
    )

    @property
    def text(self) -> str:
        return self.span_text.text

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id

    @property
    def group_ids(self):
        return [group.id for group in self.span_groups]

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    def get_project_id(self) -> int:
        return self.project_id
