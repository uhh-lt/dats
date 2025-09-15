from typing import Generic, Type, TypeVar

from fastapi import status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

from common.exception_handler import exception_handler
from repos.db.orm_base import ORMBase

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)


class UpdateNotAllowed(BaseModel):
    pass


@exception_handler(status.HTTP_404_NOT_FOUND)
class NoSuchElementError(Exception):
    def __init__(self, model: Type[ORMModelType], **kwargs):
        self.model = model
        self.model_name = model.__name__.replace("ORM", "")
        super().__init__(f"There exists no {self.model_name} with: {kwargs} !")


class CRUDBase(Generic[ORMModelType, CreateDTOType, UpdateDTOType]):
    def __init__(self, model: Type[ORMModelType]):
        """
        Generic CRUD access with default methods to Create, Read, Update, Delete ORM models.

        **Parameters**

        * `model`: A SQLAlchemy model class
        """
        self.model = model

    def read(self, db: Session, id: int) -> ORMModelType:
        db_obj = db.query(self.model).filter(self.model.id == id).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(self, db: Session, ids: list[int]) -> list[ORMModelType]:
        db_objects = db.query(self.model).filter(self.model.id.in_(ids)).all()
        return sorted(db_objects, key=lambda x: ids.index(x.id))

    def read_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> list[ORMModelType]:
        return db.query(self.model).offset(skip).limit(limit).all()

    def exists(self, db: Session, *, id: int, raise_error: bool = False) -> bool:
        exists = db.query(self.model.id).filter(self.model.id == id).first() is not None
        if not exists and raise_error:
            raise NoSuchElementError(self.model, id=id)
        return exists

    def create(
        self, db: Session, *, create_dto: CreateDTOType, manual_commit: bool = False
    ) -> ORMModelType:
        dto_obj_data = jsonable_encoder(create_dto)
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        if manual_commit:
            db.flush()
        else:
            db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[CreateDTOType],
        manual_commit: bool = False,
    ) -> list[ORMModelType]:
        db_objs = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        db.add_all(db_objs)
        if manual_commit:
            db.flush()
        else:
            db.commit()
        return db_objs

    def update(
        self,
        db: Session,
        *,
        id: int,
        update_dto: UpdateDTOType,
        manual_commit: bool = False,
    ) -> ORMModelType:
        db_obj = self.read(db=db, id=id)

        obj_data = jsonable_encoder(db_obj.as_dict())
        update_data = update_dto.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        if manual_commit:
            db.flush()
        else:
            db.commit()
        db.refresh(db_obj)

        return db_obj

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[UpdateDTOType],
        manual_commit: bool = False,
    ) -> list[ORMModelType]:
        if len(ids) != len(update_dtos):
            raise ValueError(
                f"The number of IDs and Update DTO objects must equal! {len(ids)} IDs and {len(update_dtos)} Update DTOs received."
            )
        db_objects = self.read_by_ids(db, ids)

        for db_obj, update_dto in zip(db_objects, update_dtos):
            obj_data = jsonable_encoder(db_obj.as_dict())
            update_data = update_dto.model_dump(exclude_unset=True)
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])
        db.add_all(db_objects)
        if manual_commit:
            db.flush()
        else:
            db.commit()
        return db_objects

    def delete(
        self, db: Session, *, id: int, manual_commit: bool = False
    ) -> ORMModelType:
        db_obj = self.read(db=db, id=id)
        db.delete(db_obj)
        if manual_commit:
            db.flush()
        else:
            db.commit()
        return db_obj

    def remove_multi(
        self, db: Session, *, ids: list[int], manual_commit: bool = False
    ) -> int:
        count = db.query(self.model).filter(self.model.id.in_(ids)).delete()
        if manual_commit:
            db.flush()
        else:
            db.commit()
        return count
