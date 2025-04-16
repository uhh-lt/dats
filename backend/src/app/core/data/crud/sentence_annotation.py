from typing import Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.sentence_annotation import (
    SentenceAnnotationCreate,
    SentenceAnnotationCreateIntern,
    SentenceAnnotationUpdate,
    SentenceAnnotationUpdateBulk,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM


class CRUDSentenceAnnotation(
    CRUDBase[
        SentenceAnnotationORM, SentenceAnnotationCreateIntern, SentenceAnnotationUpdate
    ]
):
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
        self, db: Session, *, user_id: int, create_dtos: List[SentenceAnnotationCreate]
    ) -> List[SentenceAnnotationORM]:
        # find affected sdocs
        sdoc_ids = {create_dto.sdoc_id for create_dto in create_dtos}

        # find project id for each sdoc_id
        sdocs = crud_sdoc.read_by_ids(db=db, ids=list(sdoc_ids))
        project_id_by_sdoc_id: Dict[int, int] = {}
        for sdoc in sdocs:
            project_id_by_sdoc_id[sdoc.id] = sdoc.project_id

        # find or create annotation documents for each sdoc_id
        adoc_id_by_sdoc_id: Dict[int, int] = {}
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

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> List[SentenceAnnotationORM]:
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
    ) -> Optional[SentenceAnnotationORM]:
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
    ) -> List[SentenceAnnotationORM]:
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
        user_ids: List[int],
        sdoc_id: int,
    ) -> List[SentenceAnnotationORM]:
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
    ) -> List[SentenceAnnotationORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .filter(
                self.model.code_id == code_id, AnnotationDocumentORM.user_id == user_id
            )
        )

        return query.all()

    def read_by_code(self, db: Session, *, code_id: int) -> List[SentenceAnnotationORM]:
        query = db.query(self.model).filter(self.model.code_id == code_id)
        return query.all()

    def read_by_codes(
        self, db: Session, *, code_ids: List[int]
    ) -> List[SentenceAnnotationORM]:
        query = db.query(self.model).filter(self.model.code_id.in_(code_ids))
        return query.all()

    def read_by_user_sdocs_codes(
        self, db: Session, *, user_id: int, sdoc_ids: List[int], code_ids: List[int]
    ) -> List[SentenceAnnotationORM]:
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

    def update(
        self, db: Session, *, id: int, update_dto: SentenceAnnotationUpdate
    ) -> SentenceAnnotationORM:
        sentence_anno = super().update(db, id=id, update_dto=update_dto)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=sentence_anno.annotation_document_id)

        return sentence_anno

    def update_bulk(
        self, db: Session, *, update_dtos: List[SentenceAnnotationUpdateBulk]
    ) -> List[SentenceAnnotationORM]:
        return [
            self.update(
                db,
                id=update_dto.sent_annotation_id,
                update_dto=SentenceAnnotationUpdate(code_id=update_dto.code_id),
            )
            for update_dto in update_dtos
        ]

    def remove(self, db: Session, *, id: int) -> SentenceAnnotationORM:
        sentence_anno = super().remove(db, id=id)
        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=sentence_anno.annotation_document_id)

        return sentence_anno

    def remove_bulk(
        self, db: Session, *, ids: List[int]
    ) -> List[SentenceAnnotationORM]:
        sentence_annos = []
        for id in ids:
            sentence_annos.append(self.remove(db, id=id))

        # find the annotation document ids
        adoc_ids = {
            sentence_anno.annotation_document_id for sentence_anno in sentence_annos
        }

        # update the annotation documents' timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return sentence_annos

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        # find all sentence annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # update the annotation document's timestamp
        from app.core.data.crud.annotation_document import crud_adoc

        crud_adoc.update_timestamp(db=db, id=adoc_id)

        # delete the sentence annotations
        query.delete()
        db.commit()

        return ids


crud_sentence_anno = CRUDSentenceAnnotation(SentenceAnnotationORM)
