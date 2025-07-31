from core.doc.folder_dto import FolderCreate, FolderType, FolderUpdate
from core.doc.folder_orm import FolderORM
from repos.db.crud_base import CRUDBase
from sqlalchemy.orm import Session


class CRUDFolder(CRUDBase[FolderORM, FolderCreate, FolderUpdate]):
    def read_subfolders(
        self, db: Session, *, parent_folder_id: int | None
    ) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.parent_id == parent_folder_id)
            .order_by(self.model.name)
            .all()
        )

    def read_by_project(self, db: Session, *, proj_id: int) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.project_id == proj_id)
            .order_by(self.model.name)
            .all()
        )

    def read_by_project_and_type(
        self, db: Session, *, proj_id: int, folder_type: FolderType
    ) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == proj_id, self.model.folder_type == folder_type
            )
            .order_by(self.model.name)
            .all()
        )


crud_folder = CRUDFolder(FolderORM)
