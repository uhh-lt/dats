from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from repos.db.orm_base import ORMBase
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from modules.ml.doc_tag_recommendation.document_tag_recommendation_orm import (
        DocumentTagRecommendationLinkORM,
    )


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
        cascade="all, delete-orphan",
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
        cascade="all, delete-orphan",
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
        "DocumentTagORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
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

    def get_project_id(self) -> int:
        return self.project_id


class SourceDocumentDocumentTagLinkTable(ORMBase):
    source_document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    document_tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documenttag.id", ondelete="CASCADE"), primary_key=True
    )
