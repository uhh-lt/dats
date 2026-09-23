from sqlalchemy.orm import Session

from core.doc.folder_dto import (
    FolderCreate,
    FolderType,
    FolderUpdate,
    FolderUpdateBulk,
)
from core.doc.folder_orm import FolderORM
from repos.db.crud_base import CRUDBase


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

    def read_by_names(
        self,
        db: Session,
        project_id: int,
        names: list[str],
        folder_type: FolderType | None = None,
    ) -> list[FolderORM]:
        query = db.query(self.model).filter(
            self.model.project_id == project_id, self.model.name.in_(names)
        )
        if folder_type is not None:
            query = query.filter(self.model.folder_type == folder_type)
        return query.all()

    def _assert_valid_move(
        self, db: Session, *, folder: FolderORM, update_dto: FolderUpdate
    ) -> None:
        # Guard every move (single or bulk): when parent_id is being set to a
        # real folder, the target must be a NORMAL folder in the same project.
        # parent_id=None (move to root) needs no target check.
        if (
            "parent_id" not in update_dto.model_fields_set
            or update_dto.parent_id is None
        ):
            return
        target_folder = self.read(db=db, id=update_dto.parent_id)
        if target_folder.folder_type != FolderType.NORMAL:
            raise ValueError("Target folder must be of type NORMAL")
        if target_folder.project_id != folder.project_id:
            raise ValueError("Cannot move a folder to a different project")
        # Cycle prevention: the target must not be the folder itself or one of its
        # descendants. Walk up the ancestor chain from the target; if we reach the
        # folder being moved, the move would create a cycle.
        ancestor: FolderORM | None = target_folder
        while ancestor is not None:
            if ancestor.id == folder.id:
                raise ValueError("Cannot move a folder into itself or its descendants")
            ancestor = (
                self.read(db=db, id=ancestor.parent_id)
                if ancestor.parent_id is not None
                else None
            )

    def update(self, db: Session, *, id: int, update_dto: FolderUpdate) -> FolderORM:
        folder = self.read(db=db, id=id)
        self._assert_valid_move(db=db, folder=folder, update_dto=update_dto)
        return super().update(db=db, id=id, update_dto=update_dto)

    def update_bulk(
        self, db: Session, *, update_dtos: list[FolderUpdateBulk]
    ) -> list[FolderORM]:
        """Update multiple folders, each identified by its folder_id."""
        folders = {
            f.id: f for f in self.read_by_ids(db, [u.folder_id for u in update_dtos])
        }
        for update_dto in update_dtos:
            self._assert_valid_move(
                db=db, folder=folders[update_dto.folder_id], update_dto=update_dto
            )
        # Delegate to the base bulk update: one read_by_ids + one flush. Strip the
        # bulk wrapper down to a plain FolderUpdate (drops the folder_id helper field).
        return self.update_multi(
            db,
            ids=[u.folder_id for u in update_dtos],
            update_dtos=[
                FolderUpdate.model_validate(u.model_dump(exclude_unset=True))
                for u in update_dtos
            ],
        )


crud_folder = CRUDFolder(FolderORM)
