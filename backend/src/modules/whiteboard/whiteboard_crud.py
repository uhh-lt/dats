from sqlalchemy.orm import Session

from modules.whiteboard.whiteboard_dto import (
    WhiteboardCreateIntern,
    WhiteboardUpdateIntern,
)
from modules.whiteboard.whiteboard_orm import WhiteboardORM
from repos.db.crud_base import SQLCRUDBase


class CRUDWhiteboard(
    SQLCRUDBase[WhiteboardORM, WhiteboardCreateIntern, WhiteboardUpdateIntern]
):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .all()
        )
        return db_obj

    ### OTHER OPERATIONS ###

    def duplicate_by_id(
        self,
        db: Session,
        *,
        whiteboard_id: int,
    ) -> WhiteboardORM:
        db_obj = self.read(db=db, id=whiteboard_id)
        return self.create(
            db=db,
            create_dto=WhiteboardCreateIntern(
                project_id=db_obj.project_id,
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
            ),
        )


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
