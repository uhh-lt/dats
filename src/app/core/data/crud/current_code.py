from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.current_code import CurrentCodeCreate, CurrentCodeUpdate
from app.core.data.orm.code import CurrentCodeORM


class CRUDCurrentCode(CRUDBase[CurrentCodeORM, CurrentCodeCreate, CurrentCodeUpdate]):

    def create(self, db: Session, *, create_dto: CurrentCodeCreate) -> CurrentCodeORM:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_current_code = CRUDCurrentCode(CurrentCodeORM)
