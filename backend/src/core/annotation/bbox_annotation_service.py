from uuid import uuid4

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_source_utils import (
    copy_annotation_source_memos,
    read_annotation_sources,
)
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreate,
    BBoxAnnotationCreateIntern,
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateBulk,
)
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.doc.source_document_crud import crud_sdoc
from core.memo.memo_enum import AttachedObjectType
from repos.db.sql_exceptions import NoSuchElementError


class BBoxAnnotationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(BBoxAnnotationService, cls).__new__(cls)

    def create(
        self, db: Session, *, user_id: int, create_dto: BBoxAnnotationCreate
    ) -> BBoxAnnotationRead:
        """
        Like `create_multi`, for one annotation.

        Raises:
            NoSuchElementError: If the annotation is a copy of an annotation that does
                not exist.
        """
        results = self.create_multi(db=db, user_id=user_id, create_dtos=[create_dto])
        if not results:
            # the copy was skipped because its source annotation does not exist
            raise NoSuchElementError(
                BBoxAnnotationORM, id=create_dto.source_annotation_id
            )
        return results[0]

    def create_multi(
        self, db: Session, *, user_id: int, create_dtos: list[BBoxAnnotationCreate]
    ) -> list[BBoxAnnotationRead]:
        """
        Create bbox annotations of a user, creating missing annotation documents.

        An annotation with a `source_annotation_id` is a copy of another annotation
        (e.g. accepted in the annotation comparison): it records the user and code
        of its source as provenance and gets copies of the source's memos (by their
        original authors). A copy whose source annotation no longer exists is
        skipped silently, the others are still created. Everything runs in a
        constant number of queries.

        Args:
            user_id: The user the annotations belong to.
            create_dtos: The annotations to create.

        Returns:
            The created annotations, in the order of `create_dtos`, without the
            skipped copies.

        Raises:
            AnnotationSourceError: If a source annotation does not annotate the same
                source document of the same project.
        """
        if not create_dtos:
            return []

        # 1) find the project of every affected source document
        sdoc_ids = list(dict.fromkeys(create_dto.sdoc_id for create_dto in create_dtos))
        project_id_by_sdoc_id = {
            sdoc.id: sdoc.project_id
            for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
        }

        # 2) read the annotations that are copied, skipping copies of deleted ones
        annotations = read_annotation_sources(
            db=db,
            crud=crud_bbox_anno,
            create_dtos=create_dtos,
            project_id_by_sdoc_id=project_id_by_sdoc_id,
        )

        # 3) find or create the user's annotation document of every source document
        adoc_by_sdoc_id = crud_adoc.exists_or_create_multi(
            db=db,
            user_id=user_id,
            sdoc_ids=list(
                dict.fromkeys(create_dto.sdoc_id for create_dto, _ in annotations)
            ),
        )

        # 4) create the annotations, with the provenance of the copies
        db_objs = crud_bbox_anno.create_multi(
            db=db,
            create_dtos=[
                BBoxAnnotationCreateIntern(
                    project_id=project_id_by_sdoc_id[create_dto.sdoc_id],
                    uuid=str(uuid4()),
                    x_min=create_dto.x_min,
                    x_max=create_dto.x_max,
                    y_min=create_dto.y_min,
                    y_max=create_dto.y_max,
                    code_id=create_dto.code_id,
                    annotation_document_id=adoc_by_sdoc_id[create_dto.sdoc_id].id,
                    source_annotation_id=source.id if source else None,
                    source_user_id=source.user_id if source else None,
                    source_code_id=source.code_id if source else None,
                )
                for create_dto, source in annotations
            ],
        )

        # 5) copy the memos of the source annotations onto their copies
        copy_annotation_source_memos(
            db=db,
            attached_object_type=AttachedObjectType.bbox_annotation,
            sources=[source for _, source in annotations],
            copies=db_objs,
        )

        # 6) read them back with their relationships for the DTOs
        return self._to_read_dtos(db=db, ids=[db_obj.id for db_obj in db_objs])

    def update_multi(
        self, db: Session, *, update_dtos: list[BBoxAnnotationUpdateBulk]
    ) -> list[BBoxAnnotationRead]:
        """
        Change the code of bbox annotations, each identified by its id.

        Args:
            update_dtos: The annotations to update. Must not repeat an id.

        Returns:
            The updated annotations, in the order of `update_dtos`.
        """
        db_objs = crud_bbox_anno.update_multi(
            db=db,
            ids=[update_dto.bbox_annotation_id for update_dto in update_dtos],
            update_dtos=[
                BBoxAnnotationUpdate(code_id=update_dto.code_id)
                for update_dto in update_dtos
            ],
        )
        return self._to_read_dtos(db=db, ids=[db_obj.id for db_obj in db_objs])

    def delete_multi(self, db: Session, *, ids: list[int]) -> list[BBoxAnnotationRead]:
        """
        Delete bbox annotations.

        Args:
            ids: The annotations to delete.

        Returns:
            The deleted annotations as they were before the deletion, in the order
            of `ids`.
        """
        # 1) snapshot the annotations before they are deleted
        deleted = [
            BBoxAnnotationRead.model_validate(db_obj)
            for db_obj in crud_bbox_anno.read_by_ids(db=db, ids=ids)
        ]

        # 2) delete them
        crud_bbox_anno.delete_multi(db=db, ids=ids)

        return deleted

    def _to_read_dtos(self, db: Session, *, ids: list[int]) -> list[BBoxAnnotationRead]:
        """Read DTOs of the given annotations, re-read with eager loading."""
        return [
            BBoxAnnotationRead.model_validate(db_obj)
            for db_obj in crud_bbox_anno.read_by_ids(db=db, ids=ids)
        ]
