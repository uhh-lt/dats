from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.user import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
    crud_user,
)
from app.core.data.dto.project import (
    ProjectCreate,
    ProjectUpdate,
)
from app.core.data.dto.user import UserRead
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.simsearch_service import SimSearchService


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

        # 2) associate the system users
        self.associate_user(db=db, proj_id=project_id, user_id=SYSTEM_USER_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_ZEROSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_FEWSHOT_ID)
        self.associate_user(db=db, proj_id=project_id, user_id=ASSISTANT_TRAINED_ID)

        # 3) associate the user that created the project
        if creating_user.id != SYSTEM_USER_ID:
            self.associate_user(db=db, proj_id=project_id, user_id=creating_user.id)

        # 4) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 5) create project metadata
        crud_project_meta.create_project_metadata_for_project(db=db, proj_id=project_id)

        # 6) create repo directory structure
        RepoService().create_directory_structure_for_project(proj_id=project_id)

        return db_obj

    def remove(self, db: Session, *, id: int) -> ProjectORM:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = super().remove(db=db, id=id)
        # 2) delete the files from repo
        RepoService().purge_project_data(proj_id=id)
        # 3) Remove embeddings
        SimSearchService().remove_all_project_embeddings(id)

        return proj_db_obj

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)

        # add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)

        # remove user from project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        return user_db_obj


crud_project = CRUDProject(ProjectORM)
