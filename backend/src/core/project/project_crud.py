from sqlalchemy import text
from sqlalchemy.orm import Session

from core.project.project_dto import ProjectCreate, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    crud_user,
)
from core.user.user_orm import UserORM
from repos.db.crud_base import SQLCRUDBase


class CRUDProject(SQLCRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    ### READ OPERATIONS ###

    def read_by_title(self, db: Session, *, title: str) -> ProjectORM | None:
        return db.query(self.model).filter(self.model.title == title).first()

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
