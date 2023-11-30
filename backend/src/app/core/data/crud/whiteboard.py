from typing import List

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.whiteboard import WhiteboardCreate, WhiteboardUpdate
from app.core.data.orm.whiteboard import WhiteboardORM


class CRUDWhiteboard(CRUDBase[WhiteboardORM, WhiteboardCreate, WhiteboardUpdate]):
    def read_by_project_and_user(
        self, db: Session, *, project_id: int, user_id: int
    ) -> List[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .all()
        )
        return db_obj

    def read_by_project(self, db: Session, *, project_id: int) -> List[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_obj


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
