from typing import Generic, Type, TypeVar

from fastapi import status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.orm import Session

from common.exception_handler import exception_handler
from config import conf
from repos.db.orm_base import ORMBase

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)

BATCH_SIZE = conf.postgres.batch_size


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

    def read_by_ids(
        self, db: Session, ids: list[int], id_field: str = "id"
    ) -> list[ORMModelType]:
        if not ids:
            return []

        db_objects: list[ORMModelType] = []

        # 1. Get the SQLA column object dynamically (e.g., self.model.id or self.model.code_id)
        try:
            model_column = getattr(self.model, id_field)
        except AttributeError:
            # Handle case where the specified key_field doesn't exist on the model
            raise ValueError(
                f"Model {self.model.__name__} does not have a field named '{id_field}'"
            )

        # Process in batches to avoid overwhelming the database with too many IDs at once
        for i in range(0, len(ids), BATCH_SIZE):
            batch_ids = ids[i : i + BATCH_SIZE]
            batch_objects = (
                db.query(self.model).filter(model_column.in_(batch_ids)).all()
            )
            db_objects.extend(batch_objects)

        # Maintain the order of the input IDs
        id_map = {getattr(obj, id_field): obj for obj in db_objects}
        result: list[ORMModelType] = []
        for id in ids:
            if id in id_map:
                result.append(id_map[id])
            else:
                raise NoSuchElementError(self.model, **{id_field: id})

        return result

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
        """
        Deletes objects by ID, processing in batches.
        Returns the total count of rows deleted.
        """
        if not ids:
            return 0

        total_deleted_count = 0

        # 1. Process ids in Batches
        for i in range(0, len(ids), BATCH_SIZE):
            batch_ids = ids[i : i + BATCH_SIZE]

            # 2. Build the DELETE Statement
            stmt = delete(self.model).where(self.model.id.in_(batch_ids))

            # 3. Execute the statement
            result = db.execute(stmt)
            total_deleted_count += result.rowcount

        # 4. Handle Commit/Flush
        if manual_commit:
            db.flush()
        else:
            db.commit()

        return total_deleted_count
