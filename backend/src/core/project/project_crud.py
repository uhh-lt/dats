from sqlalchemy import text
from sqlalchemy.orm import Session

from common.feature_enum import Feature
from core.project.project_dto import ProjectCreate, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    crud_user,
)
from core.user.user_orm import UserORM
from repos.db.crud_base import SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError


class CRUDProject(SQLCRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    ### READ OPERATIONS ###

    def read_by_title(self, db: Session, *, title: str) -> ProjectORM | None:
        return db.query(self.model).filter(self.model.title == title).first()

    def read_locked(self, db: Session, *, id: int, shared: bool = False) -> ProjectORM:
        """
        Read the project's current row and lock it until the transaction ends.

        Args:
            id: The project.
            shared: Lock it for reading only (FOR SHARE), so others can read it
                locked too, instead of for an update (FOR NO KEY UPDATE).

        Returns:
            The project.
        """
        db_obj = (
            db.query(self.model)
            .filter(self.model.id == id)
            .with_for_update(read=shared, key_share=not shared)
            .populate_existing()
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    ### UPDATE OPERATIONS ###

    def update_enabled_features(
        self, db: Session, *, id: int, features: list[Feature]
    ) -> ProjectORM:
        """Store the enabled features of the project. Only `FeatureService`
        decides them (it adds the required features and rejects invalid changes)."""
        db_obj = self.read(db=db, id=id)
        db_obj.enabled_features = list(features)
        db.add(db_obj)
        db.flush()
        return db_obj

    ### DELETE OPERATIONS ###

    def delete_multi(self, db: Session, *, ids: list[int]) -> int:
        """
        Delete the projects with all their data (ON DELETE CASCADE).

        The cascades delete the virtual users of a project and the experiment runs that
        reference them (ON DELETE NO ACTION) in any order, so only that reference
        (`experimentrun_virtual_user_id_fkey`) is checked at the commit.

        Args:
            ids: The ids to delete. Duplicates and missing ids are ignored.

        Returns:
            The number of deleted projects.
        """
        db.execute(text("SET CONSTRAINTS experimentrun_virtual_user_id_fkey DEFERRED"))
        return super().delete_multi(db=db, ids=ids)

    ### OTHER OPERATIONS ###

    def associate_user(self, db: Session, *, project_id: int, user_id: int) -> UserORM:
        # 1) read project
        proj_db_obj = self.read(db=db, id=project_id)

        # 2) add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.flush()

        return user_db_obj

    def dissociate_user(self, db: Session, *, project_id: int, user_id: int) -> UserORM:
        # 1) read project
        proj_db_obj = self.read(db=db, id=project_id)

        # 2) remove user from project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.flush()

        return user_db_obj

    def exists_by_title(self, db: Session, *, title: str) -> bool:
        return (
            db.query(self.model).filter(self.model.title == title).first() is not None
        )


crud_project = CRUDProject(ProjectORM)
