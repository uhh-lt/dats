from uuid import uuid4

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_exceptions import AnnotationSourceError
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
from core.memo.memo_service import MemoService


class BBoxAnnotationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(BBoxAnnotationService, cls).__new__(cls)

    def create(
        self, db: Session, *, user_id: int, create_dto: BBoxAnnotationCreate
    ) -> BBoxAnnotationRead:
        """Like `create_multi`, for one annotation."""
        return self.create_multi(db=db, user_id=user_id, create_dtos=[create_dto])[0]

    def create_multi(
        self, db: Session, *, user_id: int, create_dtos: list[BBoxAnnotationCreate]
    ) -> list[BBoxAnnotationRead]:
        """
        Create bbox annotations of a user, creating missing annotation documents.

        An annotation with a `source_annotation_id` is a copy of another annotation
        (e.g. accepted in the annotation comparison): it records the user and code
        of its source as provenance and gets copies of the source's memos (by their
        original authors). Everything runs in a constant number of queries.

        Args:
            user_id: The user the annotations belong to.
            create_dtos: The annotations to create.

        Returns:
            The created annotations, in the order of `create_dtos`.

        Raises:
            NoSuchElementError: If a source annotation does not exist.
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

        # 2) read the annotations that are copied
        sources = self._read_sources(
            db=db, create_dtos=create_dtos, project_id_by_sdoc_id=project_id_by_sdoc_id
        )

        # 3) find or create the user's annotation document of every source document
        adoc_by_sdoc_id = crud_adoc.exists_or_create_multi(
            db=db, user_id=user_id, sdoc_ids=sdoc_ids
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
                for create_dto, source in zip(create_dtos, sources)
            ],
        )

        # 5) copy the memos of the source annotations onto their copies
        copies = [
            (source.id, db_obj.id)
            for source, db_obj in zip(sources, db_objs)
            if source is not None
        ]
        MemoService().copy_to_attached_objects(
            db=db,
            attached_object_type=AttachedObjectType.bbox_annotation,
            source_object_ids=[source_id for source_id, _ in copies],
            target_object_ids=[copy_id for _, copy_id in copies],
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

    def _read_sources(
        self,
        db: Session,
        *,
        create_dtos: list[BBoxAnnotationCreate],
        project_id_by_sdoc_id: dict[int, int],
    ) -> list[BBoxAnnotationORM | None]:
        """
        Read the annotations the new ones are copied from with one query and check
        that each annotates the same source document of the same project.

        Returns:
            The source annotation of every create DTO (None if it is no copy), in
            the order of `create_dtos`.
        """
        source_ids = list(
            dict.fromkeys(
                create_dto.source_annotation_id
                for create_dto in create_dtos
                if create_dto.source_annotation_id is not None
            )
        )
        source_by_id = {
            db_obj.id: db_obj
            for db_obj in crud_bbox_anno.read_by_ids(db=db, ids=source_ids)
        }

        sources: list[BBoxAnnotationORM | None] = []
        for create_dto in create_dtos:
            if create_dto.source_annotation_id is None:
                sources.append(None)
                continue
            source = source_by_id[create_dto.source_annotation_id]
            if (
                source.project_id != project_id_by_sdoc_id[create_dto.sdoc_id]
                or source.sdoc_id != create_dto.sdoc_id
            ):
                raise AnnotationSourceError(
                    source_annotation_id=source.id, sdoc_id=create_dto.sdoc_id
                )
            sources.append(source)
        return sources

    def _to_read_dtos(self, db: Session, *, ids: list[int]) -> list[BBoxAnnotationRead]:
        """Read DTOs of the given annotations, re-read with eager loading."""
        return [
            BBoxAnnotationRead.model_validate(db_obj)
            for db_obj in crud_bbox_anno.read_by_ids(db=db, ids=ids)
        ]
