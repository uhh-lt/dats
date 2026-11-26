from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.memo.object_handle_orm import ObjectHandleORM
    from core.project.project_orm import ProjectORM
    from modules.tag_recommendation.tag_recommendation_orm import (
        TagRecommendationLinkORM,
    )


class TagORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, index=False)
    color: Mapped[str | None] = mapped_column(String, index=False)
    created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # one to one
    object_handle: Mapped["ObjectHandleORM"] = relationship(
        "ObjectHandleORM",
        uselist=False,
        back_populates="tag",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="ObjectHandleORM.tag_id",
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship("ProjectORM", back_populates="tags")

    # one to many
    tag_recommendation_links: Mapped[list["TagRecommendationLinkORM"]] = relationship(
        "TagRecommendationLinkORM",
        back_populates="predicted_tag",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="TagRecommendationLinkORM.predicted_tag_id",
    )

    # many to many
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        secondary="SourceDocumentTagLinkTable".lower(),
        back_populates="tags",
        viewonly=True,
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(Integer, index=True)
    parent: Mapped["TagORM | None"] = relationship(
        "TagORM",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["TagORM"]] = relationship(
        "TagORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys=[parent_id],
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="tag_pkey"),
        UniqueConstraint(
            "project_id",
            "name",
            name="UC_tag_name_unique_per_project",
        ),
        ForeignKeyConstraint(
            ["project_id", "parent_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_tag_parent_id",
        ),
    )

    @property
    def memo_ids(self) -> list[int]:
        if self.object_handle is None:
            return []
        return [memo.id for memo in self.object_handle.attached_memos]


class SourceDocumentTagLinkTable(ORMBase):
    source_document_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    tag_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["project_id", "source_document_id"],
            ["sourcedocument.project_id", "sourcedocument.id"],
            ondelete="CASCADE",
            name="FK_sourcedocumenttaglinktable_source_document_id",
        ),
        ForeignKeyConstraint(
            ["project_id", "tag_id"],
            ["tag.project_id", "tag.id"],
            ondelete="CASCADE",
            name="FK_sourcedocumenttaglinktable_tag_id",
        ),
    )
