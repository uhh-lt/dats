from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.doc.folder_dto import FolderType
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.doc.folder_orm import FolderORM
    from core.doc.source_document_orm import SourceDocumentORM
    from core.project.project_orm import ProjectORM


class FolderORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    folder_type: Mapped[FolderType] = mapped_column(
        Enum(FolderType), nullable=False, index=True
    )

    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # many to one
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
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
    )

    # hierarchy reference
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("folder.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped["FolderORM | None"] = relationship(
        "FolderORM", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["FolderORM"]] = relationship(
        "FolderORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("parent_id", "name", name="UC_unique_folder_name_in_parent"),
    )

    def get_project_id(self) -> int:
        return self.project_id
