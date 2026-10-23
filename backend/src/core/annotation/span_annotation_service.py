from uuid import uuid4

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationCreateIntern,
    SpanAnnotationDeleted,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.doc.source_document_crud import crud_sdoc


class SpanAnnotationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(SpanAnnotationService, cls).__new__(cls)

    def create(
        self, db: Session, *, user_id: int, create_dto: SpanAnnotationCreate
    ) -> SpanAnnotationRead:
        """Like `create_multi`, for one annotation."""
        return self.create_multi(db=db, user_id=user_id, create_dtos=[create_dto])[0]

    def create_multi(
        self, db: Session, *, user_id: int, create_dtos: list[SpanAnnotationCreate]
    ) -> list[SpanAnnotationRead]:
        """
        Create span annotations of a user, creating missing annotation documents.

        Args:
            user_id: The user the annotations belong to.
            create_dtos: The annotations to create.

        Returns:
            The created annotations, in the order of `create_dtos`.
        """
        db_objs = self.create_annotation_orms(
            db=db, user_id=user_id, create_dtos=create_dtos
        )
        return self._to_read_dtos(db=db, ids=[db_obj.id for db_obj in db_objs])

    def create_annotation_orms(
        self, db: Session, *, user_id: int, create_dtos: list[SpanAnnotationCreate]
    ) -> list[SpanAnnotationORM]:
        """
        Like `create_multi`, but returns the ORM objects. For other services,
        jobs and test fixtures that need the ORM objects.
        """
        if not create_dtos:
            return []

        # 1) find the project of every affected source document
        sdoc_ids = list(dict.fromkeys(create_dto.sdoc_id for create_dto in create_dtos))
        project_id_by_sdoc_id = {
            sdoc.id: sdoc.project_id
            for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        }

        # 2) find or create the user's annotation document of every source document
        adoc_by_sdoc_id = crud_adoc.exists_or_create_multi(
            db=db, user_id=user_id, sdoc_ids=sdoc_ids
        )

        # 3) create the annotations
        return crud_span_anno.create_multi(
            db=db,
            create_dtos=[
                SpanAnnotationCreateIntern(
                    project_id=project_id_by_sdoc_id[create_dto.sdoc_id],
                    uuid=str(uuid4()),
                    begin=create_dto.begin,
                    end=create_dto.end,
                    span_text=create_dto.span_text,
                    begin_token=create_dto.begin_token,
                    end_token=create_dto.end_token,
                    code_id=create_dto.code_id,
                    annotation_document_id=adoc_by_sdoc_id[create_dto.sdoc_id].id,
                )
                for create_dto in create_dtos
            ],
        )

    def update_multi(
        self, db: Session, *, update_dtos: list[SpanAnnotationUpdateBulk]
    ) -> list[SpanAnnotationRead]:
        """
        Change the code of span annotations, each identified by its id.

        Args:
            update_dtos: The annotations to update. Must not repeat an id.

        Returns:
            The updated annotations, in the order of `update_dtos`.
        """
        db_objs = crud_span_anno.update_multi(
            db=db,
            ids=[update_dto.span_annotation_id for update_dto in update_dtos],
            update_dtos=[
                SpanAnnotationUpdate(code_id=update_dto.code_id)
                for update_dto in update_dtos
            ],
        )
        return self._to_read_dtos(db=db, ids=[db_obj.id for db_obj in db_objs])

    def delete_multi(
        self, db: Session, *, ids: list[int]
    ) -> list[SpanAnnotationDeleted]:
        """
        Delete span annotations.

        Args:
            ids: The annotations to delete.

        Returns:
            The deleted annotations as they were before the deletion, in the order
            of `ids`.
        """
        # 1) snapshot the annotations before they are deleted
        deleted = [
            SpanAnnotationDeleted.model_validate(db_obj)
            for db_obj in crud_span_anno.read_by_ids(db=db, ids=ids)
        ]

        # 2) delete them
        crud_span_anno.delete_multi(db=db, ids=ids)

        return deleted

    def _to_read_dtos(self, db: Session, *, ids: list[int]) -> list[SpanAnnotationRead]:
        """Read DTOs of the given annotations, re-read with eager loading."""
        return [
            SpanAnnotationRead.model_validate(db_obj)
            for db_obj in crud_span_anno.read_by_ids(db=db, ids=ids)
        ]
