from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreateIntern,
    BBoxAnnotationUpdate,
)
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.object_handle_orm import ObjectHandleORM
from repos.db.crud_base import BATCH_SIZE
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDBBoxAnnotation(
    ProjectCRUDBase[BBoxAnnotationORM, BBoxAnnotationCreateIntern, BBoxAnnotationUpdate]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        project_id: int,
        create_dtos: list[BBoxAnnotationCreateIntern],
    ) -> list[BBoxAnnotationORM]:
        db_objs = super().create_multi(
            db=db, project_id=project_id, create_dtos=create_dtos
        )

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            {create_dto.annotation_document_id for create_dto in create_dtos}
        )
        crud_adoc.update_timestamps(db=db, ids=adoc_ids)

        return db_objs

    ### READ OPERATIONS ###

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> list[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == self.model.annotation_document_id,
            )
            .join(
                SourceDocumentORM,
                SourceDocumentORM.id == AnnotationDocumentORM.source_document_id,
            )
            .where(
                SourceDocumentORM.project_id == project_id,
            )
        )

        return query.all()

    def read_by_project_and_uuid(
        self,
        db: Session,
        *,
        project_id: int,
        uuid: str,
    ) -> BBoxAnnotationORM | None:
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .where(
                self.model.project_id == project_id,
                self.model.uuid == uuid,
            )
        )
        return query.first()

    def read_by_project_and_uuids(
        self, db: Session, *, project_id: int, uuids: list[str]
    ) -> list[BBoxAnnotationORM]:
        """
        Read the annotations of a project with the given uuids, in batches of
        `BATCH_SIZE`.

        Args:
            project_id: The project of the annotations.
            uuids: The uuids to read. Missing uuids are no error.

        Returns:
            The existing annotations, in no particular order.
        """
        if not uuids:
            return []

        db_objs: list[BBoxAnnotationORM] = []
        for i in range(0, len(uuids), BATCH_SIZE):
            batch_uuids = uuids[i : i + BATCH_SIZE]
            db_objs.extend(
                db.query(self.model)
                .options(*self._load_options())
                .filter(
                    self.model.project_id == project_id,
                    self.model.uuid.in_(batch_uuids),
                )
                .all()
            )
        return db_objs

    def read_by_users_and_sdoc(
        self,
        db: Session,
        *,
        user_ids: list[int],
        sdoc_id: int,
        exclude_disabled_codes: bool = True,
    ) -> list[BBoxAnnotationORM]:
        if not user_ids:
            return []

        db_objs: list[BBoxAnnotationORM] = []
        for i in range(0, len(user_ids), BATCH_SIZE):
            batch_user_ids = user_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model)
                .options(*self._load_options())
                .join(self.model.annotation_document)
                .where(
                    AnnotationDocumentORM.user_id.in_(batch_user_ids),
                    AnnotationDocumentORM.source_document_id == sdoc_id,
                )
            )
            if exclude_disabled_codes:
                query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712
            db_objs.extend(query.all())
        return db_objs

    def read_by_user(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        sdoc_id: int | None = None,
        code_id: int | None = None,
        exclude_disabled_codes: bool = True,
    ) -> list[BBoxAnnotationORM]:
        """
        Read the bbox annotations of a user in the project, optionally only those in
        a document or with a code.

        Args:
            project_id: The project of the annotations.
            user_id: The user the annotations belong to.
            sdoc_id: Only the annotations in this document.
            code_id: Only the annotations with this code.
            exclude_disabled_codes: Leave out the annotations with a disabled code.

        Returns:
            The matching annotations.
        """
        query = (
            db.query(self.model)
            .options(*self._load_options())
            .join(self.model.annotation_document)
            .where(
                self.model.project_id == project_id,
                AnnotationDocumentORM.user_id == user_id,
            )
        )
        if sdoc_id is not None:
            query = query.where(AnnotationDocumentORM.source_document_id == sdoc_id)
        if code_id is not None:
            query = query.where(self.model.code_id == code_id)
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712
        return query.all()

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        project_id: int,
        ids: list[int],
        update_dtos: list[BBoxAnnotationUpdate],
    ) -> list[BBoxAnnotationORM]:
        annos = super().update_multi(
            db=db, project_id=project_id, ids=ids, update_dtos=update_dtos
        )

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(
            db=db, ids=list({anno.annotation_document_id for anno in annos})
        )

        return annos

    ### DELETE OPERATIONS ###

    def delete_multi(self, db: Session, *, project_id: int, ids: list[int]) -> int:
        adoc_ids = self._read_adoc_ids(db=db, project_id=project_id, ids=ids)
        num_deletions = super().delete_multi(db=db, project_id=project_id, ids=ids)

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(db=db, ids=adoc_ids)

        return num_deletions

    def delete_by_adoc(
        self, db: Session, *, project_id: int, adoc_id: int
    ) -> list[int]:
        # find all annotations to be removed
        ids = list(
            db.scalars(
                select(self.model.id).where(
                    self.model.project_id == project_id,
                    self.model.annotation_document_id == adoc_id,
                )
            )
        )

        # delete them (updates the annotation document's timestamp)
        self.delete_multi(db=db, project_id=project_id, ids=ids)

        return ids

    def _load_options(self) -> list[ExecutableOption]:
        # everything the Read DTO reads through ORM properties
        return [
            selectinload(self.model.annotation_document),  # sdoc_id, user_id
            selectinload(self.model.object_handle).selectinload(
                ObjectHandleORM.attached_memos
            ),  # memo_ids
        ]

    def _read_adoc_ids(
        self, db: Session, *, project_id: int, ids: list[int]
    ) -> list[int]:
        """Read the distinct annotation document ids of the given annotations."""
        adoc_ids: set[int] = set()
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            adoc_ids.update(
                db.scalars(
                    select(self.model.annotation_document_id).where(
                        self.model.project_id == project_id,
                        self.model.id.in_(batch_ids),
                    )
                )
            )
        return list(adoc_ids)


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
