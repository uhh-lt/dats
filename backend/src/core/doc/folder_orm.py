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

from core.doc.folder_enum import FolderType
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.source_document_orm import SourceDocumentORM
    from core.project.project_orm import ProjectORM


class FolderORM(ORMBase):
    # the primary key is (project_id, id), see __table_args__
    id: Mapped[int] = mapped_column(Integer, autoincrement=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    folder_type: Mapped[FolderType] = mapped_column(String, nullable=False, index=True)

    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    project: Mapped["ProjectORM"] = relationship(
        "ProjectORM",
        back_populates="folders",
    )

    # one to many
    source_documents: Mapped[list["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        back_populates="folder",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="SourceDocumentORM.folder_id",
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(Integer, index=True)
    parent: Mapped["FolderORM | None"] = relationship(
        "FolderORM",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["FolderORM"]] = relationship(
        "FolderORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys=[parent_id],
    )

    __table_args__ = (
        PrimaryKeyConstraint("project_id", "id", name="folder_pkey"),
        UniqueConstraint("parent_id", "name", name="UC_unique_folder_name_in_parent"),
        UniqueConstraint("project_id", "id", name="UC_folder_project_id_id"),
        ForeignKeyConstraint(
            ["project_id", "parent_id"],
            ["folder.project_id", "folder.id"],
            ondelete="CASCADE",
            name="FK_folder_parent_id",
        ),
    )
