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

    def move_folders(
        self, db: Session, *, folder_ids: list[int], target_folder_id: int
    ) -> list[FolderORM]:
        """
        Moves the specified folders to the target folder.

        Args:
            db (Session): The current database session used for querying.
            folder_ids (list[int]): A list of folder IDs to be moved.
            target_folder_id (int): The ID of the target folder where the folders will be moved. Special case: -1 means the root folder (parent_id is None).

        Returns:
            list[FolderORM]: A list of FolderORM objects representing the moved folders.
        """
        if target_folder_id == -1:
            tfid = None
        else:
            # Ensure the target folder is of type NORMAL
            target_folder = self.read(db=db, id=target_folder_id)
            if target_folder.folder_type != FolderType.NORMAL:
                raise ValueError("Target folder must be of type NORMAL")
            tfid = target_folder_id

        db.query(self.model).filter(self.model.id.in_(folder_ids)).update(
            {self.model.parent_id: tfid}
        )
        db.commit()
        return db.query(self.model).filter(self.model.id.in_(folder_ids)).all()


crud_folder = CRUDFolder(FolderORM)
