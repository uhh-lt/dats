from sqlalchemy import and_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_enum import AttachedObjectType
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_dto import ObjectHandleCreate
from core.memo.object_handle_orm import (
    ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN,
    ObjectHandleORM,
)
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from repos.db.crud_base import BATCH_SIZE, UpdateNotAllowed
from repos.db.project_crud_base import ProjectCRUDBase
from repos.db.sql_utils import aggregate_ids


class CRUDObjectHandle(
    ProjectCRUDBase[ObjectHandleORM, ObjectHandleCreate, UpdateNotAllowed]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self, db: Session, *, project_id: int, create_dtos: list[ObjectHandleCreate]
    ) -> list[ObjectHandleORM]:
        """
        Create the object handles in one batch. An object has at most one handle, so
        for an object that already has one, the existing handle is returned instead.
        An object of another project violates the composite foreign key (409).

        Args:
            project_id: The project of the handles and their objects.
            create_dtos: The handles to create, each referring to one object.

        Returns:
            The handles, in the order of `create_dtos`.
        """
        if not create_dtos:
            return []

        # 1) insert the handles, skipping the objects that already have one
        rows = [
            {**create_dto.model_dump(), "project_id": project_id}
            for create_dto in create_dtos
        ]
        for i in range(0, len(rows), BATCH_SIZE):
            db.execute(
                insert(self.model)
                .values(rows[i : i + BATCH_SIZE])
                .on_conflict_do_nothing()
            )

        # 2) read the handles of all objects, grouped by the column of their type
        object_keys = [self._attached_object_key(row) for row in rows]
        object_ids_by_column: dict[str, list[int]] = {}
        for column, object_id in dict.fromkeys(object_keys):
            object_ids_by_column.setdefault(column, []).append(object_id)

        handle_by_object_key: dict[tuple[str, int], ObjectHandleORM] = {}
        for column, object_ids in object_ids_by_column.items():
            for i in range(0, len(object_ids), BATCH_SIZE):
                batch_ids = object_ids[i : i + BATCH_SIZE]
                for db_obj in db.scalars(
                    select(self.model).where(
                        self.model.project_id == project_id,
                        getattr(self.model, column).in_(batch_ids),
                    )
                ):
                    handle_by_object_key[(column, getattr(db_obj, column))] = db_obj

        return [handle_by_object_key[object_key] for object_key in object_keys]

    ### READ OPERATIONS ###

    def read_memo_ids_by_objects(
        self,
        db: Session,
        *,
        project_id: int,
        attached_object_type: AttachedObjectType,
        object_ids: list[int],
    ) -> dict[int, list[int]]:
        """
        Returns a mapping of object ID -> list of attached memo IDs for all given
        objects of the given type in the project, in one batched query (no N+1).
        """
        # Pre-check: If the list is empty, return an empty dictionary immediately.
        if not object_ids:
            return {}

        obj_id_column = getattr(
            self.model, ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN[attached_object_type]
        )

        # Dictionary to store the final results: {object_id: [memo_ids]}
        results: dict[int, list[int]] = {}

        # 1. Process in Batches
        memo_ids_agg = aggregate_ids(MemoORM.id, label="memo_ids")
        for i in range(0, len(object_ids), BATCH_SIZE):
            batch_ids = object_ids[i : i + BATCH_SIZE]

            # 2. Build the SELECT Statement
            stmt = (
                select(obj_id_column, memo_ids_agg)
                .join(
                    MemoORM,
                    and_(
                        MemoORM.project_id == self.model.project_id,
                        MemoORM.attached_to_id == self.model.id,
                    ),
                    isouter=True,
                )
                .filter(
                    self.model.project_id == project_id,
                    obj_id_column.in_(batch_ids),
                )
                .group_by(obj_id_column)
            )

            # 3. Execute the statement and fetch the results
            batch_rows = db.execute(stmt).all()

            # 4. Aggregate the results
            for row in batch_rows:
                results[row[0]] = row[1] if row[1] is not None else []

        return results

    def read_handled_object(
        self, db: Session, *, handle: ObjectHandleORM
    ) -> (
        CodeORM
        | TagORM
        | ProjectORM
        | SourceDocumentORM
        | SpanAnnotationORM
        | SentenceAnnotationORM
        | BBoxAnnotationORM
        | SpanGroupORM
        | None
    ):
        # the relationship of the one id column that is set, e.g. span_annotation
        for target_id in ATTACHED_OBJECT_TYPE_TO_HANDLE_COLUMN.values():
            if getattr(handle, target_id) is not None:
                return getattr(handle, target_id.removesuffix("_id"))

        raise KeyError(f"Object handle {handle.id} refers to no object!")

    ### OTHER OPERATIONS ###

    def _attached_object_key(self, row: dict[str, int | None]) -> tuple[str, int]:
        """The column and id of the one object a handle row refers to."""
        return next(
            (column, object_id)
            for column, object_id in row.items()
            if column != "project_id" and object_id is not None
        )


crud_object_handle = CRUDObjectHandle(ObjectHandleORM)
