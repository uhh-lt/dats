from sqlalchemy import JSON, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from modules.perspectives.perspectives_db_actions import PerspectiveDBActions
from repos.db.orm_base import ORMBase


class PerspectiveHistoryORM(ORMBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    history_number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_undone: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Stores the list of db operations and their parameters / data required to undo the action
    undo_data: Mapped[list[dict[PerspectiveDBActions, dict]]] = mapped_column(
        JSON, nullable=False
    )

    # Stores the list of db operations and their parameters / data required to redo the action
    redo_data: Mapped[list[dict[PerspectiveDBActions, dict]]] = mapped_column(
        JSON, nullable=False
    )

    # One-to-many relationship to AspectORM
    aspect_id: Mapped[int] = mapped_column(ForeignKey("aspect.id"), nullable=False)
    aspect = relationship("AspectORM", back_populates="histories")
