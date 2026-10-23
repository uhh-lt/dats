from typing import Any, Generic, Type, TypeVar

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import ColumnElement, CursorResult, delete, inspect, tuple_
from sqlalchemy.orm import Session
from typing_extensions import TypeVar as TypeVarWithDefault

from common.common_exceptions import DuplicateIdsError
from config import conf
from repos.db.orm_base import ORMBase
from repos.db.sql_exceptions import NoSuchElementError

ORMModelType = TypeVar("ORMModelType", bound=ORMBase)
CreateDTOType = TypeVar("CreateDTOType", bound=BaseModel)
UpdateDTOType = TypeVar("UpdateDTOType", bound=BaseModel)
# The primary key type: int for an `id` column, a tuple for a composite primary key
# (e.g. tuple[int, int] for (sdoc_id, aspect_id)), in the column order of the key.
IDType = TypeVarWithDefault("IDType", default=int)

BATCH_SIZE = conf.postgres.batch_size


class UpdateNotAllowed(BaseModel):
    pass


class SQLCRUDBase(Generic[ORMModelType, CreateDTOType, UpdateDTOType, IDType]):
    def __init__(self, model: Type[ORMModelType]):
        """
        Generic CRUD access with default methods to Create, Read, Update, Delete ORM models.

        The single-item write methods (`create`, `update`, `delete`) delegate to their
        `_multi` counterparts. A CRUD that needs extra handling overrides only the
        `_multi` method and calls `super()`, so the single-item path gets it for free.

        Every `_multi` method returns its results in the order of its input.

        Ids are primary key values: an int for a model with an `id` column, a tuple in
        key column order for a composite primary key (the fourth generic parameter).

        **Parameters**

        * `model`: A SQLAlchemy model class
        """
        self.model = model
        mapper = inspect(model)
        self._pk_columns = list(mapper.primary_key)
        self._pk_names = [
            mapper.get_property_by_column(column).key for column in self._pk_columns
        ]

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

    def read(self, db: Session, *, id: IDType) -> ORMModelType:
        db_obj = db.query(self.model).filter(self._pk_in([id])).first()
        if db_obj is None:
            raise NoSuchElementError(self.model, **self._pk_kwargs(id))
        return db_obj

    def read_by_ids(self, db: Session, *, ids: list[IDType]) -> list[ORMModelType]:
        """
        Read the rows with the given ids, in batches of `BATCH_SIZE`.

        Args:
            ids: The ids to read. Duplicates are allowed and repeated in the result.

        Returns:
            The objects, in the order of `ids`.

        Raises:
            NoSuchElementError: If any id does not exist.
        """
        if not ids:
            return []

        db_objects: list[ORMModelType] = []

        # Process in batches to avoid overwhelming the database with too many IDs at once
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            db_objects.extend(db.query(self.model).filter(self._pk_in(batch_ids)).all())

        # Maintain the order of the input IDs
        id_map = {self._pk_of(obj): obj for obj in db_objects}
        result: list[ORMModelType] = []
        for id in ids:
            if id not in id_map:
                raise NoSuchElementError(self.model, **self._pk_kwargs(id))
            result.append(id_map[id])

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
        id: IDType,
        update_dto: UpdateDTOType,
    ) -> ORMModelType:
        return self.update_multi(db=db, ids=[id], update_dtos=[update_dto])[0]

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[IDType],
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
            ValueError: If the lengths differ.
            DuplicateIdsError: If `ids` contains duplicates.
            NoSuchElementError: If any id does not exist.
        """
        self._check_update_input(ids=ids, update_dtos=update_dtos)
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
        id: IDType,
    ) -> ORMModelType:
        db_obj = self.read(db=db, id=id)
        self.delete_multi(db=db, ids=[id])
        return db_obj

    def delete_multi(
        self,
        db: Session,
        *,
        ids: list[IDType],
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
            stmt = delete(self.model).where(self._pk_in(batch_ids))

            # 3. Execute the statement
            result = db.execute(stmt)
            assert isinstance(result, CursorResult), "Expected a CursorResult!"

            total_deleted_count += result.rowcount

        # 4. Flush
        db.flush()

        return total_deleted_count

    ### OTHER OPERATIONS ###

    def exists(self, db: Session, *, id: IDType, raise_error: bool = False) -> bool:
        exists = (
            db.query(*self._pk_columns).filter(self._pk_in([id])).first() is not None
        )
        if not exists and raise_error:
            raise NoSuchElementError(self.model, **self._pk_kwargs(id))
        return exists

    ### PRIMARY KEY HELPERS ###

    def _pk_in(self, ids: list[IDType]) -> ColumnElement[bool]:
        """`<pk> IN ids`, as a tuple comparison for a composite primary key."""
        if len(self._pk_columns) == 1:
            return self._pk_columns[0].in_(ids)
        return tuple_(*self._pk_columns).in_(ids)

    def _pk_of(self, db_obj: ORMModelType) -> Any:
        """The id of a loaded object, as `read_by_ids` expects it."""
        identity = inspect(db_obj).identity
        assert identity is not None, "Expected a persistent object!"
        return identity[0] if len(identity) == 1 else tuple(identity)

    def _pk_kwargs(self, id: IDType) -> dict[str, object]:
        """The id as {key column name: value}, e.g. for NoSuchElementError."""
        values = id if isinstance(id, tuple) else (id,)
        return dict(zip(self._pk_names, values))

    def _check_update_input(
        self, *, ids: list[IDType], update_dtos: list[UpdateDTOType]
    ) -> None:
        """
        Raises:
            ValueError: If `ids` and `update_dtos` differ in length.
            DuplicateIdsError: If `ids` contains duplicates.
        """
        if len(ids) != len(update_dtos):
            raise ValueError(
                f"The number of IDs and Update DTO objects must equal! {len(ids)} IDs and {len(update_dtos)} Update DTOs received."
            )
        seen: set[IDType] = set()
        duplicates: dict[IDType, None] = {}
        for id in ids:
            if id in seen:
                duplicates[id] = None
            seen.add(id)
        if duplicates:
            raise DuplicateIdsError(list(duplicates))
