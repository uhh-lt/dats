from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import crud_user, SYSTEM_USER_ID
from app.core.data.dto.project import ProjectCreate, ProjectUpdate
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.user import UserORM


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):

    def create(self, db: Session, *, create_dto: ProjectCreate) -> ProjectORM:
        # TODO Flo: create ES indices
        # 1) create the project
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        # 2) associate the system user
        self.associate_user(db=db, id=db_obj.id, user_id=SYSTEM_USER_ID)

        # 3) create system codes
        crud_code.create_system_codes_for_project(db=db, proj_id=db_obj.id)

        return db_obj

    def remove_all_source_documents(self, db: Session, *, id: int) -> ProjectORM:
        db_obj = self.read(db=db, id=id)
        statement = delete(SourceDocumentORM).where(SourceDocumentORM.project_id == db_obj.id)
        db.execute(statement)
        db.commit()
        return db_obj

    def remove_all_codes(self, db: Session, *, id: int) -> ProjectORM:
        db_obj = self.read(db=db, id=id)
        statement = delete(CodeORM).where(CodeORM.project_id == db_obj.id)
        db.execute(statement)
        db.commit()
        return db_obj

    def associate_user(self, db: Session, *, id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=id)
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.append(user_db_obj)
        db.add(proj_db_obj)
        db.commit()
        return user_db_obj

    def dissociate_user(self, db: Session, *, id: int, user_id: int) -> UserORM:
        proj_db_obj = self.read(db=db, id=id)
        user_db_obj = crud_user.read(db=db, id=user_id)
        proj_db_obj.users.remove(user_db_obj)
        db.add(proj_db_obj)
        db.commit()
        return user_db_obj


crud_project = CRUDProject(ProjectORM)
