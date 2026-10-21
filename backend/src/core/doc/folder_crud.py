from sqlalchemy.orm import Session

from core.doc.folder_dto import FolderCreate, FolderUpdate
from core.doc.folder_enum import FolderType
from core.doc.folder_exceptions import (
    FolderMoveAcrossProjectsError,
    FolderMoveCycleError,
    FolderMoveToNonNormalFolderError,
)
from core.doc.folder_orm import FolderORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDFolder(SQLCRUDBase[FolderORM, FolderCreate, FolderUpdate]):
    ### READ OPERATIONS ###

    def read_subfolders(
        self, db: Session, *, parent_folder_id: int | None
    ) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.parent_id == parent_folder_id)
            .order_by(self.model.name)
            .all()
        )

    def read_with_children(self, db: Session, *, folder_id: int) -> list[FolderORM]:
        """The folder and all of its descendant folders."""
        topq = (
            db.query(self.model.id)
            .filter(self.model.id == folder_id)
            .cte("cte", recursive=True)
        )
        bottomq = db.query(self.model.id).join(topq, self.model.parent_id == topq.c.id)
        recursive_q = topq.union(bottomq)  # type: ignore
        return (
            db.query(self.model)
            .filter(self.model.id.in_(db.query(recursive_q.c.id)))
            .all()
        )

    def read_by_project(self, db: Session, *, project_id: int) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(self.model.project_id == project_id)
            .order_by(self.model.name)
            .all()
        )

    def read_by_project_and_type(
        self, db: Session, *, project_id: int, folder_type: FolderType
    ) -> list[FolderORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.folder_type == folder_type,
            )
            .order_by(self.model.name)
            .all()
        )

    def read_by_name_and_project(
        self, db: Session, *, folder_name: str, project_id: int
    ) -> FolderORM | None:
        return (
            db.query(self.model)
            .filter(self.model.name == folder_name, self.model.project_id == project_id)
            .first()
        )

    def read_by_names(
        self,
        db: Session,
        *,
        project_id: int,
        names: list[str],
        folder_type: FolderType | None = None,
    ) -> list[FolderORM]:
        if not names:
            return []

        db_objs: list[FolderORM] = []
        for i in range(0, len(names), BATCH_SIZE):
            batch_names = names[i : i + BATCH_SIZE]
            query = db.query(self.model).filter(
                self.model.project_id == project_id, self.model.name.in_(batch_names)
            )
            if folder_type is not None:
                query = query.filter(self.model.folder_type == folder_type)
            db_objs.extend(query.all())
        return db_objs

    def read_empty_sdoc_folders(
        self, db: Session, *, folder_ids: list[int]
    ) -> list[FolderORM]:
        """
        Reads the SDOC_FOLDERs among the given folders that contain neither
        SourceDocuments nor subfolders. NORMAL folders are never returned.

        Args:
            db: The database session.
            folder_ids: The candidate folder IDs; missing IDs are skipped.

        Returns:
            The empty SDOC_FOLDERs.
        """
        if not folder_ids:
            return []

        db_objs: list[FolderORM] = []
        for i in range(0, len(folder_ids), BATCH_SIZE):
            batch_ids = folder_ids[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(self.model)
                .filter(
                    self.model.id.in_(batch_ids),
                    self.model.folder_type == FolderType.SDOC_FOLDER,
                    ~self.model.source_documents.any(),
                    ~self.model.children.any(),
                )
                .all()
            )
        return db_objs

    ### UPDATE OPERATIONS ###

    def update_multi(
        self, db: Session, *, ids: list[int], update_dtos: list[FolderUpdate]
    ) -> list[FolderORM]:
        # Guard every move before writing anything
        folders = self.read_by_ids(db=db, ids=ids)
        for folder, update_dto in zip(folders, update_dtos):
            self._assert_valid_move(db=db, folder=folder, update_dto=update_dto)
        return super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

    ### OTHER OPERATIONS ###

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
            raise FolderMoveToNonNormalFolderError(target_folder.id)
        if target_folder.project_id != folder.project_id:
            raise FolderMoveAcrossProjectsError(folder.id, target_folder.id)
        # Cycle prevention: the target must not be the folder itself or one of its
        # descendants. Walk up the ancestor chain from the target; if we reach the
        # folder being moved, the move would create a cycle.
        ancestor: FolderORM | None = target_folder
        while ancestor is not None:
            if ancestor.id == folder.id:
                raise FolderMoveCycleError(folder.id, target_folder.id)
            ancestor = (
                self.read(db=db, id=ancestor.parent_id)
                if ancestor.parent_id is not None
                else None
            )


crud_folder = CRUDFolder(FolderORM)
