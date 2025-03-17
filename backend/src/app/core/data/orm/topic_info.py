from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.data.orm.orm_base import ORMBase

if TYPE_CHECKING:
    from app.core.data.orm.project import ProjectORM


class TopicInfoORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    doc_count: Mapped[int] = mapped_column(Integer, nullable=True, index=True)
    # JSON representation of a list of TopicWordInfo (see DTO)
    topic_words: Mapped[str] = mapped_column(
        String,
        server_default="[]",
        nullable=False,
        index=False,
    )

    topic_documents: Mapped[str] = mapped_column(
        String,
        server_default="[]",
        nullable=False,
        index=False,
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
        "ProjectORM", back_populates="topic_infos"
    )
