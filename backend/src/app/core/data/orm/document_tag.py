from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.document_tag_recommendation import (
        DocumentTagRecommendationLinkORM,
    )
    from app.core.data.orm.object_handle import ObjectHandleORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM


class DocumentTagORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
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
        "ObjectHandleORM",
        uselist=False,
        back_populates="document_tag",
        passive_deletes=True,
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM", back_populates="document_tags"
    )

    # one to many
    document_tag_recommendation_links: Mapped[
        List["DocumentTagRecommendationLinkORM"]
    ] = relationship(
        "DocumentTagRecommendationLinkORM",
        back_populates="predicted_tag",
        passive_deletes=True,
    )

    # many to many
    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="SourceDocumentDocumentTagLinkTable".lower(),
        back_populates="document_tags",
        passive_deletes=True,
    )

    # hierarchy reference
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("documenttag.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped["DocumentTagORM"] = relationship("DocumentTagORM", remote_side=[id])
    children: Mapped[List["DocumentTagORM"]] = relationship(
        "DocumentTagORM", back_populates="parent", passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_tag_name_unique_per_project",
        ),
    )

    @property
    def memo_ids(self) -> List[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]


class SourceDocumentDocumentTagLinkTable(ORMBase):
    source_document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    document_tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documenttag.id", ondelete="CASCADE"), primary_key=True
    )
