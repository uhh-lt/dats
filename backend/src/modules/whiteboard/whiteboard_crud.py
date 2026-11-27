from sqlalchemy.orm import Session

from modules.whiteboard.whiteboard_dto import (
    WhiteboardCreateIntern,
    WhiteboardUpdateIntern,
)
from modules.whiteboard.whiteboard_orm import WhiteboardORM
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDWhiteboard(
    ProjectCRUDBase[WhiteboardORM, WhiteboardCreateIntern, WhiteboardUpdateIntern]
):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[WhiteboardORM]:
        db_obj = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
            )
            .order_by(self.model.id)
            .all()
        )
        return db_obj

    ### OTHER OPERATIONS ###

    def duplicate_by_id(
        self,
        db: Session,
        *,
        project_id: int,
        whiteboard_id: int,
    ) -> WhiteboardORM:
        db_obj = self.read(db=db, project_id=project_id, id=whiteboard_id)
        return self.create(
            db=db,
            project_id=project_id,
            create_dto=WhiteboardCreateIntern(
                title=db_obj.title + " (Copy)",
                content=db_obj.content,
            ),
        )


crud_whiteboard = CRUDWhiteboard(WhiteboardORM)
