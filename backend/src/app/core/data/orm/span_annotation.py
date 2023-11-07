from datetime import datetime
from typing import TYPE_CHECKING, List

from app.core.data.orm.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.code import CurrentCodeORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.span_group import SpanGroupORM
    from app.core.data.orm.span_text import SpanTextORM


class SpanAnnotationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
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
        "CurrentCodeORM", back_populates="span_annotations"
    )

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
    span_groups: Mapped[List["SpanGroupORM"]] = relationship(
        "SpanGroupORM",
        secondary="SpanAnnotationSpanGroupLinkTable".lower(),
        back_populates="span_annotations",
    )
