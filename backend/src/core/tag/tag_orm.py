from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from modules.ml.tag_recommendation.tag_recommendation_orm import (
        TagRecommendationLinkORM,
    )


class TagORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, index=False)
    color: Mapped[str | None] = mapped_column(String, index=False)
    created: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="tag",
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
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="tags")

    # one to many
    tag_recommendation_links: Mapped[list["TagRecommendationLinkORM"]] = relationship(
        "TagRecommendationLinkORM",
        back_populates="predicted_tag",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # many to many
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="SourceDocumentTagLinkTable".lower(),
        back_populates="tags",
        passive_deletes=True,
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("tag.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped["TagORM"] = relationship("TagORM", remote_side=[id])
    children: Mapped[list["TagORM"]] = relationship(
        "TagORM",
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
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]

    def get_project_id(self) -> int:
        return self.project_id


class SourceDocumentTagLinkTable(ORMBase):
    source_document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sourcedocument.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True
    )
