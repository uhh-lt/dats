from uuid import uuid4

from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_dto import (
    BBoxAnnotationCreate,
    BBoxAnnotationCreateIntern,
    BBoxAnnotationUpdate,
    BBoxAnnotationUpdateBulk,
)
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from repos.db.crud_base import CRUDBase


class CRUDBBoxAnnotation(
    CRUDBase[BBoxAnnotationORM, BBoxAnnotationCreateIntern, BBoxAnnotationUpdate]
):
    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, user_id: int, create_dto: BBoxAnnotationCreate
    ) -> BBoxAnnotationORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        # create the BboxAnnotation
        db_obj = super().create(
            db=db,
            create_dto=BBoxAnnotationCreateIntern(
                project_id=adoc.source_document.project_id,
                uuid=str(uuid4()),
                x_min=create_dto.x_min,
                x_max=create_dto.x_max,
                y_min=create_dto.y_min,
                y_max=create_dto.y_max,
                code_id=create_dto.code_id,
                annotation_document_id=adoc.id,
            ),
        )

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc.id)

        return db_obj

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[BBoxAnnotationCreateIntern],
        manual_commit: bool = False,
    ) -> list[BBoxAnnotationORM]:
        # update all affected annotation documents' timestamp
        adoc_ids = list(
            set([create_dto.annotation_document_id for create_dto in create_dtos])
        )
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id, manual_commit=manual_commit)

        return super().create_multi(
            db=db, create_dtos=create_dtos, manual_commit=manual_commit
        )

    def create_bulk(
        self, db: Session, *, user_id: int, create_dtos: list[BBoxAnnotationCreate]
    ) -> list[BBoxAnnotationORM]:
        # find affected sdocs
        sdoc_ids = {create_dto.sdoc_id for create_dto in create_dtos}

        # find project id for each sdoc_id
        sdocs = crud_sdoc.read_by_ids(db=db, ids=list(sdoc_ids))
        project_id_by_sdoc_id: dict[int, int] = {}
        for sdoc in sdocs:
            project_id_by_sdoc_id[sdoc.id] = sdoc.project_id

        # find or create annotation documents for each sdoc_id
        adoc_id_by_sdoc_id: dict[int, int] = {}
        for sdoc_id in sdoc_ids:
            adoc_id_by_sdoc_id[sdoc_id] = crud_adoc.exists_or_create(
                db=db, user_id=user_id, sdoc_id=sdoc_id
            ).id

        # create the annotations
        return self.create_multi(
            db=db,
            create_dtos=[
                BBoxAnnotationCreateIntern(
                    project_id=project_id_by_sdoc_id[create_dto.sdoc_id],
                    uuid=str(uuid4()),
                    x_max=create_dto.x_max,
                    y_max=create_dto.y_max,
                    x_min=create_dto.x_min,
                    y_min=create_dto.y_min,
                    code_id=create_dto.code_id,
                    annotation_document_id=adoc_id_by_sdoc_id[create_dto.sdoc_id],
                )
                for create_dto in create_dtos
            ],
        )

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
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id.in_(user_ids),
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712

        return query.all()

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

    def update(
        self, db: Session, *, id: int, update_dto: BBoxAnnotationUpdate
    ) -> BBoxAnnotationORM:
        bbox_anno = super().update(db, id=id, update_dto=update_dto)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=bbox_anno.annotation_document_id)

        return bbox_anno

    def update_bulk(
        self, db: Session, *, update_dtos: list[BBoxAnnotationUpdateBulk]
    ) -> list[BBoxAnnotationORM]:
        return [
            self.update(
                db,
                id=update_dto.bbox_annotation_id,
                update_dto=BBoxAnnotationUpdate(code_id=update_dto.code_id),
            )
            for update_dto in update_dtos
        ]

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, id: int) -> BBoxAnnotationORM:
        bbox_anno = super().delete(db, id=id)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=bbox_anno.annotation_document_id)

        return bbox_anno

    def delete_bulk(self, db: Session, *, ids: list[int]) -> list[BBoxAnnotationORM]:
        bbox_annos = []
        for id in ids:
            bbox_annos.append(self.delete(db, id=id))

        # find the annotation document ids
        adoc_ids = {bbox_anno.annotation_document_id for bbox_anno in bbox_annos}

        # update the annotation documents' timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return bbox_annos

    def delete_by_adoc(self, db: Session, *, adoc_id: int) -> list[int]:
        # find all bbox annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # update the annotation document's timestamp
        from core.annotation.annotation_document_crud import crud_adoc

        crud_adoc.update_timestamp(db=db, id=adoc_id)

        # delete the bbox annotations
        query.delete()
        db.commit()

        return ids


crud_bbox_anno = CRUDBBoxAnnotation(BBoxAnnotationORM)
