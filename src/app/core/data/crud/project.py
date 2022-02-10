from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.user import crud_user
from app.core.data.dto.project import ProjectCreate, ProjectUpdate
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.user import UserORM


class CRUDProject(CRUDBase[ProjectORM, ProjectCreate, ProjectUpdate]):
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
