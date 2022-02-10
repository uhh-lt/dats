from typing import Generic, List, Optional, Type, TypeVar

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.orm.orm_base import ORMBase

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)


class NoSuchElementError(Exception):
    def __init__(self, model: Type[ORMModelType], id: int):
        self.model = model
        self.model_name = model.__name__.replace('ORM', '')
        self.id = id
        super().__init__(f"There exists no {self.model_name} with ID = {id} !")


class CRUDBase(Generic[ORMModelType, CreateDTOType, UpdateDTOType]):
    def __init__(self, model: Type[ORMModelType]):
        """
        Generic CRUD access with default methods to Create, Read, Update, Delete ORM models.

        **Parameters**

        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def read(self, db: Session, id: int) -> Optional[ORMModelType]:
        db_obj = db.query(self.model).filter(self.model.id == id).first()
        if not db_obj:
            raise NoSuchElementError(self.model, id)
        return db_obj

    def read_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[ORMModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, create_dto: CreateDTOType) -> ORMModelType:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, id: int, update_dto: UpdateDTOType) -> ORMModelType:
        db_obj = db.query(self.model).get(id)
        if not db_obj:
            raise NoSuchElementError(self.model, id)
        obj_data = jsonable_encoder(db_obj)
        update_data = update_dto.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ORMModelType:
        db_obj = db.query(self.model).get(id)
        if not db_obj:
            raise NoSuchElementError(self.model, id)
        db.delete(db_obj)
        db.commit()
        return db_obj
