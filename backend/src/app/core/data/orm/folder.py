from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

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

from app.core.data.dto.folder import FolderType
from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.folder import FolderORM
    from app.core.data.orm.project import ProjectORM
    from app.core.data.orm.source_document import SourceDocumentORM


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
    source_documents: Mapped[List["SourceDocumentORM"]] = relationship(
        "SourceDocumentORM",
        back_populates="folder",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # hierarchy reference
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("folder.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    parent: Mapped[Optional["FolderORM"]] = relationship(
        "FolderORM", remote_side=[id], back_populates="children"
    )
    children: Mapped[List["FolderORM"]] = relationship(
        "FolderORM",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("parent_id", "name", name="UC_unique_folder_name_in_parent"),
    )
