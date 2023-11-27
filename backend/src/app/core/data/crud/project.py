from typing import Optional

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.action import ActionType
from app.core.data.dto.project import (
    ProjectCreate,
    ProjectRead,
    ProjectReadAction,
    ProjectUpdate,
)
from app.core.data.dto.user import UserRead
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    def create(
        self, db: Session, *, create_dto: ProjectCreate, creating_user: UserRead
    ) -> ProjectORM:
        # 1) create the project
        dto_obj_data = jsonable_encoder(create_dto)
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        project_id = db_obj.id

        # 2) create action
        after_state = self._get_action_state_from_orm(db_obj=db_obj)
        self._create_action(
            db_obj=db_obj,
            action_type=ActionType.CREATE,
            after_state=after_state,
        )

        # 3) associate the system user
        self.associate_user(db=db, proj_id=project_id, user_id=SYSTEM_USER_ID)

        # 4) associate the user that created the project
        if creating_user.id != SYSTEM_USER_ID:
            self.associate_user(db=db, proj_id=project_id, user_id=creating_user.id)

        # 5) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 6) create repo directory structure
        RepoService().create_directory_structure_for_project(proj_id=project_id)

        return db_obj

    def remove(self, db: Session, *, id: int) -> Optional[ProjectORM]:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = super().remove(db=db, id=id)
        # 2) delete the files from repo
        RepoService().purge_project_data(proj_id=id)

        return proj_db_obj

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        # create before_state
        proj_db_obj = self.read(db=db, id=proj_id)
        before_state = self._get_action_state_from_orm(db_obj=proj_db_obj)

        # add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        # create after_state
        db.refresh(proj_db_obj)
        after_state = self._get_action_state_from_orm(db_obj=proj_db_obj)

        # create update action
        self._create_action(
            db_obj=proj_db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        # create before_state
        proj_db_obj = self.read(db=db, id=proj_id)
        before_state = self._get_action_state_from_orm(db_obj=proj_db_obj)

        # remove user from project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        # create after_state
        db.refresh(proj_db_obj)
        after_state = self._get_action_state_from_orm(db_obj=proj_db_obj)

        # create update action
        self._create_action(
            db_obj=proj_db_obj,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        return user_db_obj

    def _get_action_state_from_orm(self, db_obj: ProjectORM) -> Optional[str]:
        with SQLService().db_session() as db:
            num_sdocs = crud_sdoc.get_number_of_sdocs_in_project(
                db=db, proj_id=db_obj.id
            )
        return srsly.json_dumps(
            ProjectReadAction(
                **ProjectRead.from_orm(db_obj).dict(),
                users=[UserRead.from_orm(user) for user in db_obj.users],
                num_sdocs=num_sdocs,
            ).dict()
        )


crud_project = CRUDProject(ProjectORM)
