from sqlalchemy import select
from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreateIntern,
    BBoxAnnotationUpdate,
)
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDBBoxAnnotation(
    SQLCRUDBase[BBoxAnnotationORM, BBoxAnnotationCreateIntern, BBoxAnnotationUpdate]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[BBoxAnnotationCreateIntern],
    ) -> list[BBoxAnnotationORM]:
        db_objs = super().create_multi(db=db, create_dtos=create_dtos)

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
        query = db.query(self.model).where(
            self.model.project_id == project_id,
            self.model.uuid == uuid,
        )
        return query.first()

    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
        exclude_disabled_codes: bool = True,
    ) -> list[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712

        return query.all()

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

    def read_by_code_and_user(
        self,
        db: Session,
        *,
        code_id: int,
        user_id: int,
        exclude_disabled_codes: bool = True,
    ) -> list[BBoxAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .filter(
                self.model.code_id == code_id, AnnotationDocumentORM.user_id == user_id
            )
        )
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712

        return query.all()

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[BBoxAnnotationUpdate],
    ) -> list[BBoxAnnotationORM]:
        annos = super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(
            db=db, ids=list({anno.annotation_document_id for anno in annos})
        )

        return annos

    ### DELETE OPERATIONS ###

    def delete_multi(self, db: Session, *, ids: list[int]) -> int:
        adoc_ids = self._read_adoc_ids(db=db, ids=ids)
        num_deletions = super().delete_multi(db=db, ids=ids)

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(db=db, ids=adoc_ids)

        return num_deletions

    def delete_by_sdoc(
        self,
        db: Session,
        *,
        sdoc_id: int,
    ) -> int:
        # 1. find all affected annotation ids
        anno_ids = (
            db.query(self.model.id)
            .join(self.model.annotation_document)
            .filter(AnnotationDocumentORM.source_document_id == sdoc_id)
            .all()
        )
        anno_ids = [anno_id_tuple[0] for anno_id_tuple in anno_ids]

        # 2. delete all by ids
        num_deletions = self.delete_multi(
            db=db,
            ids=anno_ids,
        )

        return num_deletions

    def delete_by_adoc(self, db: Session, *, adoc_id: int) -> list[int]:
        # find all annotations to be removed
        ids = list(
            db.scalars(
                select(self.model.id).where(
                    self.model.annotation_document_id == adoc_id
                )
            )
        )

        # delete them (updates the annotation document's timestamp)
        self.delete_multi(db=db, ids=ids)

        return ids

    def _read_adoc_ids(self, db: Session, *, ids: list[int]) -> list[int]:
        """Read the distinct annotation document ids of the given annotations."""
        adoc_ids: set[int] = set()
        unique_ids = list(dict.fromkeys(ids))
        for i in range(0, len(unique_ids), BATCH_SIZE):
            batch_ids = unique_ids[i : i + BATCH_SIZE]
            adoc_ids.update(
                db.scalars(
                    select(self.model.annotation_document_id).where(
                        self.model.id.in_(batch_ids)
                    )
                )
            )
        return list(adoc_ids)


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
