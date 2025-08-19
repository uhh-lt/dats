from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from core.code.code_crud import crud_code
from core.metadata.project_metadata_crud import crud_project_meta
from core.project.project_dto import ProjectCreate, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_TRAINED_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_ID,
    crud_user,
)
from core.user.user_orm import UserORM
from repos.db.crud_base import CRUDBase
from repos.filesystem_repo import FilesystemRepo
from systems.event_system.events import (
    project_created,
    project_deleted,
    user_added_to_project,
)


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, create_dto: ProjectCreate, creating_user: UserORM
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
        if creating_user.id not in [
            SYSTEM_USER_ID,
            ASSISTANT_ZEROSHOT_ID,
            ASSISTANT_FEWSHOT_ID,
            ASSISTANT_TRAINED_ID,
        ]:
            self.associate_user(db=db, proj_id=project_id, user_id=creating_user.id)

        # 4) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=project_id)

        # 5) create project metadata
        crud_project_meta.create_project_metadata_for_project(db=db, proj_id=project_id)

        # 6) create filesystem directory structure
        FilesystemRepo().create_directory_structure_for_project(proj_id=project_id)

        # 7) emit project created event
        project_created.send(self, project_id=project_id)

        return db_obj

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, id: int) -> ProjectORM:
        # 1) delete the project and all connected data via cascading delete
        proj_db_obj = super().delete(db=db, id=id)

        # 2) delete the files from filesystem
        FilesystemRepo().purge_project_data(proj_id=id)

        # 3) Emit project deleted event
        project_deleted.send(self, project_id=id)

        return proj_db_obj

    ### OTHER OPERATIONS ###

    def associate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        # 1) read project
        proj_db_obj = self.read(db=db, id=proj_id)

        # 2) add user to project
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()

        # 3) emit user associated event
        user_added_to_project.send(self, project_id=proj_id, user_id=user_id)

        return user_db_obj

    def dissociate_user(self, db: Session, *, proj_id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=proj_id)

        # remove user from project
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
