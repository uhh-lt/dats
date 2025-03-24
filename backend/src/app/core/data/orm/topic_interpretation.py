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
    from app.core.data.orm.topic_info import TopicInfoORM


class TopicInterpretationORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    topic_name: Mapped[str] = mapped_column(String, nullable=True, index=True)
    reasoning: Mapped[str] = mapped_column(String, nullable=True, index=True)

    created: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.current_timestamp()
    )

    # many to one
    topic_info_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("topicinfo.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topicinfo: Mapped["TopicInfoORM"] = relationship(
        "TopicInfoORM", back_populates="topic_interpretations"
    )
