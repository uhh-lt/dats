from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.folder import FolderCreate, FolderUpdate
from app.core.data.orm.folder import FolderORM


class CRUDFolder(CRUDBase[FolderORM, FolderCreate, FolderUpdate]):
    def read_subfolders(
        self, db: Session, *, parent_folder_id: Optional[int]
    ) -> List[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.parent_id == parent_folder_id)
            .order_by(self.model.name)
            .all()
        )

    def read_by_project(self, db: Session, *, proj_id: int) -> List[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.project_id == proj_id)
            .order_by(self.model.name)
            .all()
        )


crud_folder = CRUDFolder(FolderORM)
