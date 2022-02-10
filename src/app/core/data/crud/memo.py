from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.dto.memo import MemoCreate
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM


class CRUDMemo(CRUDBase[MemoORM, MemoCreate, None]):

    def create(self, db: Session, *, create_dto: MemoCreate) -> MemoORM:
        raise NotImplementedError()

    def __create_memo(self, create_dto: MemoCreate, db: Session, oh_db_obj: ObjectHandleORM):
        # create the Memo
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["attached_to_id"] = oh_db_obj.id
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_for_code(self, db: Session, code_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Code
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(code_id=code_id))

        return self.__create_memo(create_dto, db, oh_db_obj)

    def create_for_project(self, db: Session, project_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Project
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(project_id=project_id))

        return self.__create_memo(create_dto, db, oh_db_obj)


crud_memo = CRUDMemo(MemoORM)
