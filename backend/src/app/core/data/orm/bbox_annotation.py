from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.code import CurrentCodeORM
    from app.core.data.orm.object_handle import ObjectHandleORM


class BBoxAnnotationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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
        passive_deletes=True,
    )

    # many to one
    current_code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("currentcode.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_code: Mapped["CurrentCodeORM"] = relationship(
        "CurrentCodeORM", back_populates="bbox_annotations"
    )

    annotation_document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: Mapped["AnnotationDocumentORM"] = relationship(
        "AnnotationDocumentORM", back_populates="bbox_annotations"
    )

    @property
    def code(self):
        return self.current_code.code

    @property
    def user_id(self):
        return self.annotation_document.user_id

    @property
    def sdoc_id(self):
        return self.annotation_document.source_document_id
