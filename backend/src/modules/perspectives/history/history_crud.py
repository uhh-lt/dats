from sqlalchemy.orm import Session

from modules.perspectives.history.history_dto import (
    PerspectivesHistoryCreate,
    PerspectivesHistoryUpdate,
)
from modules.perspectives.history.history_orm import PerspectiveHistoryORM
from repos.db.crud_base import CRUDBase


class CRUDPerspectivesHistory(
    CRUDBase[
        PerspectiveHistoryORM, PerspectivesHistoryCreate, PerspectivesHistoryUpdate
    ]
):
    def read_by_aspect(
        self, db: Session, *, aspect_id: int
    ) -> list[PerspectiveHistoryORM]:
        return (
            db.query(self.model)
            .filter(self.model.aspect_id == aspect_id)
            .order_by(self.model.history_number)
            .all()
        )


crud_perspectives_history = CRUDPerspectivesHistory(PerspectiveHistoryORM)
