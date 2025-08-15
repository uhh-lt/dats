from uuid import uuid4

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationCreateIntern,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_text_crud import crud_span_text
from core.annotation.span_text_dto import SpanTextCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from fastapi.encoders import jsonable_encoder
from repos.db.crud_base import CRUDBase
from sqlalchemy.orm import Session


class CRUDSpanAnnotation(
    CRUDBase[SpanAnnotationORM, SpanAnnotationCreateIntern, SpanAnnotationUpdate]
):
    def create(
        self, db: Session, *, user_id: int, create_dto: SpanAnnotationCreate
    ) -> SpanAnnotationORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        # first create the SpanText
        span_text_orm = crud_span_text.create(
            db=db, create_dto=SpanTextCreate(text=create_dto.span_text)
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_obj_data = jsonable_encoder(
            SpanAnnotationCreateIntern(
                project_id=adoc.source_document.project_id,
                uuid=str(uuid4()),
                annotation_document_id=adoc.id,
                begin=create_dto.begin,
                end=create_dto.end,
                begin_token=create_dto.begin_token,
                end_token=create_dto.end_token,
                code_id=create_dto.code_id,
                span_text=create_dto.span_text,
            ).model_dump(exclude={"span_text"})
        )
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db_obj.span_text_id = span_text_orm.id
        db.add(db_obj)
        db.commit()

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc.id)

        return db_obj

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[SpanAnnotationCreateIntern],
        manual_commit: bool = False,
    ) -> list[SpanAnnotationORM]:
        # first create the SpanText
        span_texts_orm = crud_span_text.create_multi(
            db=db,
            create_dtos=[
                SpanTextCreate(text=create_dto.span_text) for create_dto in create_dtos
            ],
            manual_commit=manual_commit,
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_objs_data = [
            jsonable_encoder(create_dto.model_dump(exclude={"span_text"}))
            for create_dto in create_dtos
        ]
        # noinspection PyArgumentList
        db_objs = [self.model(**dto_obj_data) for dto_obj_data in dto_objs_data]
        for db_obj, span_text_orm in zip(db_objs, span_texts_orm):
            db_obj.span_text_id = span_text_orm.id
        db.add_all(db_objs)
        if manual_commit:
            db.flush()
        else:
            db.commit()

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            set([create_dto.annotation_document_id for create_dto in create_dtos])
        )
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return db_objs

    def create_bulk(
        self, db: Session, *, user_id: int, create_dtos: list[SpanAnnotationCreate]
    ) -> list[SpanAnnotationORM]:
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
                SpanAnnotationCreateIntern(
                    project_id=project_id_by_sdoc_id[create_dto.sdoc_id],
                    uuid=str(uuid4()),
                    begin=create_dto.begin,
                    end=create_dto.end,
                    span_text=create_dto.span_text,
                    begin_token=create_dto.begin_token,
                    end_token=create_dto.end_token,
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
    ) -> list[SpanAnnotationORM]:
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
    ) -> SpanAnnotationORM | None:
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
    ) -> list[SpanAnnotationORM]:
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
    ) -> list[SpanAnnotationORM]:
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
    ) -> list[SpanAnnotationORM]:
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

    def update(
        self, db: Session, *, id: int, update_dto: SpanAnnotationUpdate
    ) -> SpanAnnotationORM:
        span_anno = super().update(db, id=id, update_dto=update_dto)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=span_anno.annotation_document_id)

        return span_anno

    def update_bulk(
        self, db: Session, *, update_dtos: list[SpanAnnotationUpdateBulk]
    ) -> list[SpanAnnotationORM]:
        return [
            self.update(
                db,
                id=update_dto.span_annotation_id,
                update_dto=SpanAnnotationUpdate(code_id=update_dto.code_id),
            )
            for update_dto in update_dtos
        ]

    def delete(self, db: Session, *, id: int) -> SpanAnnotationORM:
        span_anno = super().delete(db, id=id)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=span_anno.annotation_document_id)

        return span_anno

    def remove_bulk(self, db: Session, *, ids: list[int]) -> list[SpanAnnotationORM]:
        span_annos = []
        for id in ids:
            span_annos.append(self.delete(db, id=id))

        # find the annotation document ids
        adoc_ids = {span_anno.annotation_document_id for span_anno in span_annos}

        # update the annotation documents' timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return span_annos

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> list[int]:
        # find all span annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the sdocs
        query.delete()
        db.commit()

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc_id)

        return ids

    def remove_from_all_span_groups(
        self, db: Session, span_id: int
    ) -> SpanAnnotationORM:
        db_obj = self.read(db=db, id=span_id)
        db_obj.span_groups = []
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_to_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> SpanAnnotationORM:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.span_groups.append(group_db_obj)
        db.add(span_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj

    def remove_from_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> SpanAnnotationORM:
        span_db_obj = self.read(db=db, id=span_id)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
