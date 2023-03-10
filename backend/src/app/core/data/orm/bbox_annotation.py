from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.code import CurrentCodeORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.annotation_document import AnnotationDocumentORM


class BBoxAnnotationORM(ORMBase):
    id = Column(Integer, primary_key=True, index=True)
    x_min = Column(Integer, nullable=False, index=True)
    x_max = Column(Integer, nullable=False, index=True)
    y_min = Column(Integer, nullable=False, index=True)
    y_max = Column(Integer, nullable=False, index=True)
    created = Column(DateTime, server_default=func.now(), index=True)
    updated = Column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: "ObjectHandleORM" = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="bbox_annotation",
        passive_deletes=True,
    )

    # many to one
    current_code_id = Column(
        Integer,
        ForeignKey("currentcode.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_code: "CurrentCodeORM" = relationship(
        "CurrentCodeORM", back_populates="bbox_annotations"
    )

    annotation_document_id = Column(
        Integer,
        ForeignKey("annotationdocument.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    annotation_document: "AnnotationDocumentORM" = relationship(
        "AnnotationDocumentORM", back_populates="bbox_annotations"
    )
