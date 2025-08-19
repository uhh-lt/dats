from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.annotation.span_annotation_orm import SpanAnnotationORM


class SpanTextORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # FIXME: index row size X exceeds btree version 4 maximum 2704 for index ... (Problem with very large annotations)
    text: Mapped[str] = mapped_column(String, index=True, unique=True)

    # one to many
    span_annotations: Mapped[list["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM", back_populates="span_text", passive_deletes=True
    )
