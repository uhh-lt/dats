from typing import TYPE_CHECKING, List

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class SpanTextORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # FIXME: index row size X exceeds btree version 4 maximum 2704 for index ... (Problem with very large annotations)
    text: Mapped[str] = mapped_column(String, index=True)

    # one to many
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM", back_populates="span_text", passive_deletes=True
    )
