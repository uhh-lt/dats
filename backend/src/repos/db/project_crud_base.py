from typing import Type

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from repos.db.crud_base import (
    CreateDTOType,
    ORMModelType,
    SQLCRUDBase,
    UpdateDTOType,
)


class ProjectCRUDBase(
    SQLCRUDBase[ORMModelType, CreateDTOType, UpdateDTOType, tuple[int, int]]
):
    """
    The CRUD of a project-owned table with the primary key `(project_id, id)`.

    Every method takes the project as `project_id` and the plain ids of its rows,
    so one call touches one project only: an id of another project is not found
    (`NoSuchElementError`, 404). Create DTOs carry no `project_id`; `create_multi`
    sets it.

    The public methods change the signatures of `SQLCRUDBase`; they build on its
    primary key operations (`_read_pks`, `_update_pks`, ...), which take
    `(project_id, id)` tuples.
    """

    def __init__(self, model: Type[ORMModelType]):
        super().__init__(model)
        # the model declares PrimaryKeyConstraint("project_id", "id")
        assert self._pk_names == ["project_id", "id"], (
            f"{model.__name__} needs the primary key (project_id, id), "
            f"not {self._pk_names}"
        )

    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, project_id: int, create_dto: CreateDTOType
    ) -> ORMModelType:
        return self.create_multi(
            db=db, project_id=project_id, create_dtos=[create_dto]
        )[0]

    def create_multi(
        self, db: Session, *, project_id: int, create_dtos: list[CreateDTOType]
    ) -> list[ORMModelType]:
        """
        Create one row per DTO in the project, with a single flush.

        Args:
            project_id: The project of the rows.
            create_dtos: The rows to create.

        Returns:
            The created objects, in the order of `create_dtos`.
        """
        if not create_dtos:
            return []

        db_objs = [
            self.model(**jsonable_encoder(x), project_id=project_id)
            for x in create_dtos
        ]
        db.add_all(db_objs)
        db.flush()
        return db_objs

    ### READ OPERATIONS ###

    def read(self, db: Session, *, project_id: int, id: int) -> ORMModelType:
        return self._read_pk(db=db, pk=(project_id, id))

    def read_by_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[ORMModelType]:
        """
        Read the rows of the project with the given ids, in batches.

        Args:
            project_id: The project of the rows.
            ids: The ids to read. Duplicates are allowed and repeated in the result.

        Returns:
            The objects, in the order of `ids`.

        Raises:
            NoSuchElementError: If any id does not exist in the project.
        """
        return self._read_pks(db=db, pks=[(project_id, id) for id in ids])

    def read_existing_by_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> dict[int, ORMModelType]:
        """
        Read the rows of the project with the given ids that exist, in batches.

        Args:
            project_id: The project of the rows.
            ids: The ids to read. Duplicates are allowed.

        Returns:
            The existing objects by their id. Missing ids have no entry.
        """
        existing = self._read_existing_pks(db=db, pks=[(project_id, id) for id in ids])
        return {id: db_obj for (_, id), db_obj in existing.items()}

    ### UPDATE OPERATIONS ###

    def update(
        self, db: Session, *, project_id: int, id: int, update_dto: UpdateDTOType
    ) -> ORMModelType:
        return self.update_multi(
            db=db, project_id=project_id, ids=[id], update_dtos=[update_dto]
        )[0]

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        ids: list[int],
        update_dtos: list[UpdateDTOType],
    ) -> list[ORMModelType]:
        """
        Apply `update_dtos[i]` to the row `ids[i]` of the project, with one read and
        a single flush. Only the fields set in an update DTO are written.

        Args:
            project_id: The project of the rows.
            ids: The ids of the rows to update. Must not contain duplicates.
            update_dtos: One update DTO per id.

        Returns:
            The updated objects, in the order of `ids`.

        Raises:
            ValueError: If the lengths differ.
            DuplicateIdsError: If `ids` contains duplicates.
            NoSuchElementError: If any id does not exist in the project.
        """
        self._check_update_input(ids=ids, update_dtos=update_dtos)
        return self._update_pks(
            db=db, pks=[(project_id, id) for id in ids], update_dtos=update_dtos
        )

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, project_id: int, id: int) -> ORMModelType:
        db_obj = self.read(db=db, project_id=project_id, id=id)
        self.delete_multi(db=db, project_id=project_id, ids=[id])
        return db_obj

    def delete_multi(self, db: Session, *, project_id: int, ids: list[int]) -> int:
        """
        Delete the rows of the project with the given ids, in batches.

        Args:
            project_id: The project of the rows.
            ids: The ids to delete. Duplicates and missing ids are ignored.

        Returns:
            The number of deleted rows.
        """
        return self._delete_pks(db=db, pks=[(project_id, id) for id in ids])

    ### OTHER OPERATIONS ###

    def exists(
        self, db: Session, *, project_id: int, id: int, raise_error: bool = False
    ) -> bool:
        return self._exists_pk(db=db, pk=(project_id, id), raise_error=raise_error)
