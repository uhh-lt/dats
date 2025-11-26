from sqlalchemy.orm import Session

from core.project.project_dto import ProjectCreate, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    crud_user,
)
from core.user.user_orm import UserORM
from repos.db.crud_base import CRUDBase


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    ### OTHER OPERATIONS ###

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        # 1) read project
        proj_db_obj = self.read(db=db, id=proj_id)

        # 2) add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        # 1) read project
        proj_db_obj = self.read(db=db, id=proj_id)

        # 2) remove user from project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj

    def exists_by_title(self, db: Session, title: str) -> bool:
        return (
            db.query(self.model).filter(self.model.title == title).first() is not None
        )


crud_project = CRUDProject(ProjectORM)
