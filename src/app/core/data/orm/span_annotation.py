from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.annotation_document import AnnotationDocumentORM
    from app.core.data.orm.code import CurrentCodeORM
    from app.core.data.orm.object_handle import ObjectHandleORM


class SpanAnnotationORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    begin = Column(Integer, nullable=False, index=True)
    end = Column(Integer, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(DateTime, server_default=func.now(), onupdate=func.current_timestamp())

    # one to one
    object_handle: "ObjectHandleORM" = relationship("ObjectHandleORM",
                                                    uselist=False,
                                                    back_populates="span_annotation",
                                                    cascade="all, delete",
                                                    passive_deletes=True)

    # many to one
    current_code_id = Column(Integer, ForeignKey('currentcode.id', ondelete="CASCADE"), index=True)
    current_code: "CurrentCodeORM" = relationship("CurrentCodeORM", back_populates="span_annotations")

    annotation_document_id = Column(Integer, ForeignKey('annotationdocument.id', ondelete="CASCADE"), index=True)
    annotation_document: "AnnotationDocumentORM" = relationship("AnnotationDocumentORM",
                                                                back_populates="span_annotations")
