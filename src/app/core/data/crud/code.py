from typing import List, Dict, Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.code import CodeCreate, CodeUpdate
from app.core.data.dto.current_code import CurrentCodeCreate
from app.core.data.orm.code import CodeORM
from app.util.color import get_random_color
from config import conf


class CRUDCode(CRUDBase[CodeORM, CodeCreate, CodeUpdate]):

    def create(self, db: Session, *, create_dto: CodeCreate) -> CodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        # first create the code
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()

        # second create a CurrentCode that links to the code
        ccc = CurrentCodeCreate(code_id=db_obj.id)
        cc_db_obj = crud_current_code.create(db=db, create_dto=ccc)

        db.refresh(db_obj)
        return db_obj

    def create_system_codes_for_project(self, db: Session, proj_id: int) -> List[CodeORM]:
        created: List[CodeORM] = []

        def __create_recursively(code_dict: Dict[str, Dict[str, Any]], parent_code_id: int = None):
            for code_name in code_dict.keys():
                create_dto = CodeCreate(name=str(code_name),
                                        color=get_random_color()[0],
                                        description=code_dict[code_name]["desc"],
                                        project_id=proj_id,
                                        user_id=SYSTEM_USER_ID,
                                        parent_code_id=parent_code_id)

                if not self.exists_by_name_and_user_and_project(db,
                                                                code_name=create_dto.name,
                                                                proj_id=create_dto.project_id,
                                                                user_id=create_dto.user_id):
                    db_code = self.create(db=db, create_dto=create_dto)
                    created.append(db_code)

                    if "children" in code_dict[code_name]:
                        __create_recursively(code_dict[code_name]["children"], parent_code_id=db_code.id)

        __create_recursively(conf.system_codes)

        return created

    def read_by_name(self, db: Session, code_name: str) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name).all()

    def read_by_name_and_project(self, db: Session, code_name: str, proj_id: int) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name,
                                           self.model.project_id == proj_id).all()

    def read_by_user_and_project(self, db: Session, user_id: int, proj_id: int) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.user_id == user_id,
                                           self.model.project_id == proj_id).all()

    def read_by_name_and_user(self, db: Session, code_name: str, user_id: int) -> List[CodeORM]:
        return db.query(self.model).filter(self.model.name == code_name,
                                           self.model.user_id == user_id).all()

    def read_by_name_and_user_and_project(self, db: Session, code_name: str, user_id: int, proj_id: int) -> CodeORM:
        return db.query(self.model).filter(self.model.name == code_name,
                                           self.model.user_id == user_id,
                                           self.model.project_id == proj_id).first()

    def exists_by_name(self, db: Session, *, code_name: str) -> bool:
        return db.query(self.model.id).filter(self.model.name == code_name).first() is not None

    def exists_by_name_and_project(self, db: Session, *, code_name: str, proj_id: int) -> bool:
        return db.query(self.model.id).filter(self.model.name == code_name,
                                              self.model.project_id == proj_id).first() is not None

    def exists_by_name_and_user(self, db: Session, *, code_name: str, user_id: int) -> bool:
        return db.query(self.model.id).filter(self.model.name == code_name,
                                              self.model.user_id == user_id).first() is not None

    def exists_by_name_and_user_and_project(self, db: Session, *, code_name: str, user_id: int, proj_id: int) -> bool:
        return db.query(self.model.id).filter(self.model.name == code_name,
                                              self.model.user_id == user_id,
                                              self.model.project_id == proj_id).first() is not None

    def remove_by_user_and_project(self, db: Session, user_id: int, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.user_id == user_id,
                                             self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

    def remove_by_project(self, db: Session, *, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))


crud_code = CRUDCode(CodeORM)
