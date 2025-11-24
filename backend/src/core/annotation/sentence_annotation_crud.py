from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.orm import Session

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationCreateIntern,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
)
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from repos.db.crud_base import CRUDBase


class CRUDSentenceAnnotation(
    CRUDBase[
        SentenceAnnotationORM, SentenceAnnotationCreateIntern, SentenceAnnotationUpdate
    ]
):
    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, user_id: int, create_dto: SentenceAnnotationCreate
    ) -> SentenceAnnotationORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        # create the SentenceAnnotation
        db_obj = super().create(
            db=db,
            create_dto=SentenceAnnotationCreateIntern(
                project_id=adoc.source_document.project_id,
                uuid=str(uuid4()),
                sentence_id_start=create_dto.sentence_id_start,
                sentence_id_end=create_dto.sentence_id_end,
                code_id=create_dto.code_id,
                annotation_document_id=adoc.id,
            ),
        )

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc.id)

        return db_obj

    def create_bulk(
        self, db: Session, *, user_id: int, create_dtos: list[SentenceAnnotationCreate]
    ) -> list[SentenceAnnotationORM]:
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
                SentenceAnnotationCreateIntern(
                    project_id=project_id_by_sdoc_id[create_dto.sdoc_id],
                    uuid=str(uuid4()),
                    sentence_id_end=create_dto.sentence_id_end,
                    sentence_id_start=create_dto.sentence_id_start,
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
    ) -> list[SentenceAnnotationORM]:
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
    ) -> SentenceAnnotationORM | None:
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
    ) -> list[SentenceAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        return query.all()

    def read_by_users_and_sdoc(
        self,
        db: Session,
        *,
        user_ids: list[int],
        sdoc_id: int,
    ) -> list[SentenceAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id.in_(user_ids),
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        return query.all()

    def read_by_code_and_user(
        self, db: Session, *, code_id: int, user_id: int
    ) -> list[SentenceAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .filter(
                self.model.code_id == code_id, AnnotationDocumentORM.user_id == user_id
            )
        )

        return query.all()

    def read_by_code(self, db: Session, *, code_id: int) -> list[SentenceAnnotationORM]:
        query = db.query(self.model).filter(self.model.code_id == code_id)
        return query.all()

    def read_by_codes(
        self, db: Session, *, code_ids: list[int]
    ) -> list[SentenceAnnotationORM]:
        query = db.query(self.model).filter(self.model.code_id.in_(code_ids))
        return query.all()

    def read_by_user_sdocs_codes(
        self, db: Session, *, user_id: int, sdoc_ids: list[int], code_ids: list[int]
    ) -> list[SentenceAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .filter(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                self.model.code_id.in_(code_ids),
            )
        )
        return query.all()

    ### UPDATE OPERATIONS ###

    def update(
        self, db: Session, *, id: int, update_dto: SentenceAnnotationUpdate
    ) -> SentenceAnnotationORM:
        sentence_anno = super().update(db, id=id, update_dto=update_dto)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=sentence_anno.annotation_document_id)

        return sentence_anno

    def update_bulk(
        self, db: Session, *, update_dtos: list[SentenceAnnotationUpdateBulk]
    ) -> list[SentenceAnnotationORM]:
        return [
            self.update(
                db,
                id=update_dto.sent_annotation_id,
                update_dto=SentenceAnnotationUpdate(code_id=update_dto.code_id),
            )
            for update_dto in update_dtos
        ]

    ### DELETE OPERATIONS ###

    def delete(self, db: Session, *, id: int) -> SentenceAnnotationORM:
        sentence_anno = super().delete(db, id=id)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=sentence_anno.annotation_document_id)

        return sentence_anno

    def delete_bulk(
        self, db: Session, *, ids: list[int]
    ) -> list[SentenceAnnotationORM]:
        sentence_annos = []
        for id in ids:
            sentence_annos.append(self.delete(db, id=id))

        # find the annotation document ids
        adoc_ids = {
            sentence_anno.annotation_document_id for sentence_anno in sentence_annos
        }

        # update the annotation documents' timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return sentence_annos

    def delete_by_sdoc(
        self, db: Session, *, sdoc_id: int, manual_commit: bool = False
    ) -> int:
        # 1. find all affected annotation ids
        anno_ids = (
            db.query(self.model.id)
            .join(self.model.annotation_document)
            .filter(AnnotationDocumentORM.source_document_id == sdoc_id)
            .all()
        )
        anno_ids = [anno_id_tuple[0] for anno_id_tuple in anno_ids]

        # 2. delete the annotations
        num_deletions = self.remove_multi(
            db=db, ids=anno_ids, manual_commit=manual_commit
        )

        return num_deletions

    def delete_by_adoc(self, db: Session, *, adoc_id: int) -> list[int]:
        # find all sentence annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # update the annotation document's timestamp
        from core.annotation.annotation_document_crud import crud_adoc

        crud_adoc.update_timestamp(db=db, id=adoc_id)

        # delete the sentence annotations
        query.delete()
        db.commit()

        return ids

    def remove_by_user_sdocs_codes(
        self, db: Session, *, user_id: int, sdoc_ids: list[int], code_ids: list[int]
    ) -> list[int]:
        # find all span annotations to be removed
        query = (
            db.query(self.model.id, AnnotationDocumentORM.id)
            .join(self.model.annotation_document)
            .filter(
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                AnnotationDocumentORM.user_id == user_id,
                self.model.code_id.in_(code_ids),
            )
        )
        removed_orms = query.all()
        anno_ids = [removed_orm.tuple()[0] for removed_orm in removed_orms]
        adoc_ids = list({removed_orm.tuple()[1] for removed_orm in removed_orms})

        # delete the sdocs
        self.remove_multi(db=db, ids=anno_ids)

        # update the annotation document's timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return anno_ids

    def count_by_codes_and_sdocs_and_user(
        self,
        db: Session,
        *,
        code_ids: list[int],
        sdoc_ids: list[int],
        user_id: int,
    ) -> dict[int, int]:
        result = (
            db.query(self.model.code_id, func.count(self.model.id))
            .join(self.model.annotation_document)
            .where(
                self.model.code_id.in_(code_ids),
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                AnnotationDocumentORM.user_id == user_id,
            )
            .group_by(self.model.code_id)
        )
        return {code_id: count for code_id, count in result.all()}


crud_sentence_anno = CRUDSentenceAnnotation(SentenceAnnotationORM)
