from typing import Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import crud_user, SYSTEM_USER_ID
from app.core.data.dto.action import ActionType, ActionTargetObjectType, ActionCreate
from app.core.data.dto.project import ProjectCreate, ProjectUpdate
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.data.repo.repo_service import RepoService


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):

    def create(self, db: Session, *, create_dto: ProjectCreate) -> ProjectORM:
        # 1) create the project
        dto_obj_data = jsonable_encoder(create_dto)
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        project_id = db_obj.id

        # create action manually because we're not using crud base create
        from app.core.data.crud.action import crud_action
        create_dto = ActionCreate(project_id=project_id,
                                  user_id=SYSTEM_USER_ID,
                                  action_type=ActionType.CREATE,
                                  target_type=ActionTargetObjectType.project,
                                  target_id=project_id)
        crud_action.create(db=db, create_dto=create_dto)

        # 2) associate the system user
        self.associate_user(db=db, proj_id=project_id, user_id=SYSTEM_USER_ID)

        # 3) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 4) create repo directory structure
        RepoService().create_directory_structure_for_project(proj_id=project_id)

        return db_obj

    def remove(self, db: Session, *, id: int) -> Optional[ProjectORM]:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = super().remove(db=db, id=id)
        # 2) delete the files from repo
        RepoService().purge_project_data(proj_id=id)

        return proj_db_obj

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        # create update action
        from app.core.data.crud.action import crud_action
        create_dto = ActionCreate(project_id=proj_id,
                                  user_id=SYSTEM_USER_ID,
                                  action_type=ActionType.UPDATE,
                                  target_type=ActionTargetObjectType.project,
                                  target_id=proj_id)
        crud_action.create(db=db, create_dto=create_dto)
        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        # create update action
        from app.core.data.crud.action import crud_action
        create_dto = ActionCreate(project_id=proj_id,
                                  user_id=SYSTEM_USER_ID,
                                  action_type=ActionType.UPDATE,
                                  target_type=ActionTargetObjectType.project,
                                  target_id=proj_id)
        crud_action.create(db=db, create_dto=create_dto)

        return user_db_obj


crud_project = CRUDProject(ProjectORM)