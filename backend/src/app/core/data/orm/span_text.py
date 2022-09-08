from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class SpanTextORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)

    # one to many
    span_annotations: List["SpanAnnotationORM"] = relationship("SpanAnnotationORM",
                                                               back_populates="span_text",
                                                               passive_deletes=True)
