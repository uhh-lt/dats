from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
    from app.core.data.orm.span_annotation import SpanAnnotationORM


class CodeORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    is_system: Mapped[Optional[str]] = mapped_column(
        Boolean, index=False, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(String, index=False)
    color: Mapped[Optional[str]] = mapped_column(String, index=False)
    created: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM", uselist=False, back_populates="code", passive_deletes=True
    )

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="codes")

    # one to many
    span_annotations: Mapped[List["SpanAnnotationORM"]] = relationship(
        "SpanAnnotationORM", back_populates="code", passive_deletes=True
    )

    # one to many
    bbox_annotations: Mapped[List["BBoxAnnotationORM"]] = relationship(
        "BBoxAnnotationORM", back_populates="code", passive_deletes=True
    )

    # one to many
    sentence_annotations: Mapped[List["SentenceAnnotationORM"]] = relationship(
        "SentenceAnnotationORM", back_populates="code", passive_deletes=True
    )

    # hierarchy reference
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("code.id", ondelete="CASCADE")
    )
    parent: Mapped["CodeORM"] = relationship("CodeORM", remote_side=[id])

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_code_name_unique_per_project",
        ),
    )
