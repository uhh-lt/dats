from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.current_code import crud_current_code
from app.core.data.dto.code import CodeCreate, CodeUpdate
from app.core.data.dto.current_code import CurrentCodeCreate
from app.core.data.orm.code import CodeORM


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

    def exists_by_name(self, db: Session, *, name: int) -> bool:
        return db.query(self.model.id).filter(self.model.name == name).first() is not None


crud_code = CRUDCode(CodeORM)
