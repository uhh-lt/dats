from typing import Generic, Type, TypeVar

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import CursorResult, delete, inspect
from sqlalchemy.orm import Session

from config import conf
from repos.db.orm_base import ORMBase
from repos.db.sql_exceptions import NoSuchElementError

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)

BATCH_SIZE = conf.postgres.batch_size


class UpdateNotAllowed(BaseModel):
    pass


class SQLCRUDBase(Generic[ORMModelType, CreateDTOType, UpdateDTOType]):
    def __init__(self, model: Type[ORMModelType]):
        """
        Generic CRUD access with default methods to Create, Read, Update, Delete ORM models.

        The single-item write methods (`create`, `update`, `delete`) delegate to their
        `_multi` counterparts. A CRUD that needs extra handling overrides only the
        `_multi` method and calls `super()`, so the single-item path gets it for free.

        Every `_multi` method returns its results in the order of its input.

        **Parameters**

        * `model`: A SQLAlchemy model class
        """
        self.model = model

    ### CREATE OPERATIONS ###

    def create(
        self,
        db: Session,
        *,
        create_dto: CreateDTOType,
    ) -> ORMModelType:
        return self.create_multi(db=db, create_dtos=[create_dto])[0]

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[CreateDTOType],
    ) -> list[ORMModelType]:
        """
        Create one row per DTO with a single flush.

        Args:
            create_dtos: The rows to create.

        Returns:
            The created objects, in the order of `create_dtos`.
        """
        if not create_dtos:
            return []

        db_objs = [self.model(**jsonable_encoder(x)) for x in create_dtos]
        db.add_all(db_objs)
        db.flush()
        return db_objs

    ### READ OPERATIONS ###

    def read(self, db: Session, *, id: int) -> ORMModelType:
        db_obj = db.query(self.model).filter(self.model.id == id).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, id=id)
        return db_obj

    def read_by_ids(
        self, db: Session, *, ids: list[int], id_field: str = "id"
    ) -> list[ORMModelType]:
        """
        Read the rows with the given ids, in batches of `BATCH_SIZE`.

        Args:
            ids: The ids to read. Duplicates are allowed and repeated in the result.
            id_field: The column the ids refer to.

        Returns:
            The objects, in the order of `ids`.

        Raises:
            NoSuchElementError: If any id does not exist.
        """
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
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
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

    ### UPDATE OPERATIONS ###

    def update(
        self,
        db: Session,
        *,
        id: int,
        update_dto: UpdateDTOType,
    ) -> ORMModelType:
        return self.update_multi(db=db, ids=[id], update_dtos=[update_dto])[0]

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[UpdateDTOType],
    ) -> list[ORMModelType]:
        """
        Apply `update_dtos[i]` to the row `ids[i]`, with one read and a single flush.

        Only the fields set in an update DTO are written.

        Args:
            ids: The ids of the rows to update. Must not contain duplicates.
            update_dtos: One update DTO per id.

        Returns:
            The updated objects, in the order of `ids`.

        Raises:
            ValueError: If the lengths differ or `ids` contains duplicates.
            NoSuchElementError: If any id does not exist.
        """
        if len(ids) != len(update_dtos):
            raise ValueError(
                f"The number of IDs and Update DTO objects must equal! {len(ids)} IDs and {len(update_dtos)} Update DTOs received."
            )
        if len(set(ids)) != len(ids):
            raise ValueError("The IDs to update must not contain duplicates!")
        if not ids:
            return []

        db_objects = self.read_by_ids(db=db, ids=ids)

        column_keys = {c.key for c in inspect(self.model).column_attrs}
        for db_obj, update_dto in zip(db_objects, update_dtos):
            update_data = update_dto.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if field in column_keys:
                    setattr(db_obj, field, value)
        db.flush()

        # Changed foreign keys do not update already loaded relationships, so expire
        # them: they are lazily reloaded on the next access.
        relationship_keys = list(inspect(self.model).relationships.keys())
        if relationship_keys:
            for db_obj in db_objects:
                db.expire(db_obj, relationship_keys)

        return db_objects

    ### DELETE OPERATIONS ###

    def delete(
        self,
        db: Session,
        *,
        id: int,
    ) -> ORMModelType:
        db_obj = self.read(db=db, id=id)
        self.delete_multi(db=db, ids=[id])
        return db_obj

    def delete_multi(
        self,
        db: Session,
        *,
        ids: list[int],
    ) -> int:
        """
        Delete the rows with the given ids, in batches of `BATCH_SIZE`.

        Child rows are removed by the foreign keys' ON DELETE rules. Callers that need
        the deleted objects (e.g. for websocket events) read them with `read_by_ids`
        before deleting.

        Args:
            ids: The ids to delete. Duplicates and missing ids are ignored.

        Returns:
            The number of deleted rows.
        """
        if not ids:
            return 0

        total_deleted_count = 0

        # 1. Process ids in Batches
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]

            # 2. Build the DELETE Statement
            stmt = delete(self.model).where(self.model.id.in_(batch_ids))

            # 3. Execute the statement
            result = db.execute(stmt)
            assert isinstance(result, CursorResult), "Expected a CursorResult!"

            total_deleted_count += result.rowcount

        # 4. Flush
        db.flush()

        return total_deleted_count

    ### OTHER OPERATIONS ###

    def exists(self, db: Session, *, id: int, raise_error: bool = False) -> bool:
        exists = db.query(self.model.id).filter(self.model.id == id).first() is not None
        if not exists and raise_error:
            raise NoSuchElementError(self.model, id=id)
        return exists
