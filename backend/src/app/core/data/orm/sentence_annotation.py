from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.code import CodeORM
from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM


class SentenceAnnotationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String, nullable=False, index=True)
    sentence_id_start: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sentence_id_end: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
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
        back_populates="sentence_annotation",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "project.id", ondelete="CASCADE", name="FK_sentence_annotation_project_id"
        ),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="sentence_annotations"
    )

    code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("code.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped["CodeORM"] = relationship(
        "CodeORM", back_populates="sentence_annotations"
    )

    annotation_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="sentence_annotations"
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "uuid",
            name="UC_sentence_annotation_uuid_unique_per_project",
        ),
    )

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id
