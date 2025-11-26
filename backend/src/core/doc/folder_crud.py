from sqlalchemy import update
from sqlalchemy.orm import Session

from config import conf
from core.doc.folder_dto import FolderCreate, FolderType, FolderUpdate
from core.doc.folder_orm import FolderORM
from repos.db.crud_base import CRUDBase

BATCH_SIZE = conf.postgres.batch_size


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

    def read_by_name_and_project(
        self, db: Session, folder_name: str, proj_id: int
    ) -> FolderORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == folder_name, self.model.project_id == proj_id)
            .first()
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
        # 1. Determine the Parent ID (tfid)
        if target_folder_id == -1:
            tfid = None
        else:
            # Ensure the target folder is of type NORMAL
            target_folder = self.read(db=db, id=target_folder_id)
            if target_folder.folder_type != FolderType.NORMAL:
                raise ValueError("Target folder must be of type NORMAL")
            tfid = target_folder_id

        # 2. Batch UPDATE Operations
        update_payload = {self.model.parent_id: tfid}
        for i in range(0, len(folder_ids), BATCH_SIZE):
            batch_ids = folder_ids[i : i + BATCH_SIZE]
            stmt = (
                update(self.model)
                .where(self.model.id.in_(batch_ids))
                .values(update_payload)
            )
            db.execute(stmt)
        # Commit all batched updates at once
        db.commit()

        # 3. Retrieve and Return Updated Folders
        return self.read_by_ids(db=db, ids=folder_ids)


crud_folder = CRUDFolder(FolderORM)
