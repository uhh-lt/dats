from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from repos.db.orm_base import ORMBase


class PerspectiveHistoryORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aspect_id: Mapped[int] = mapped_column(ForeignKey("aspect.id"), nullable=False)

    # Store enum as string
    action_type: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Stores the state required to reverse the action
    undo_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Stores the parameters required to re-apply the action
    redo_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    is_undone: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Assuming standard one-to-many from Aspect to History
    # aspect = relationship("AspectORM", back_populates="history")
