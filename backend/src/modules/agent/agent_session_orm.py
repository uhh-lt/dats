from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.agent.agent_enum import AgentName
from repos.db.orm_base import ORMBase

if TYPE_CHECKING:
    from core.user.user_orm import UserORM


class AgentSessionORM(ORMBase):
    """A chat session of a user with an agent. `session_id` is chosen by the client
    (the AG-UI thread id) and is unique per user."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String)
    # the agent the session talks to (sessions before this column: the project agent)
    agent_name: Mapped[AgentName] = mapped_column(
        String, nullable=False, server_default=AgentName.PROJECT.value
    )
    # pydantic-ai messages, serialized with ModelMessagesTypeAdapter (see AgentSessionCreate)
    messages: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.current_timestamp(),
    )

    # many to one
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user: Mapped["UserORM"] = relationship("UserORM", back_populates="agent_sessions")

    __table_args__ = (
        UniqueConstraint(
            "user_id", "session_id", name="UC_agent_session_id_unique_per_user"
        ),
    )
