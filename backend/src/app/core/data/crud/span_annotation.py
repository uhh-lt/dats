from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.span_text import crud_span_text
from app.core.data.dto.span_annotation import (
    SpanAnnotationCreate,
    SpanAnnotationCreateIntern,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM


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
        self, db: Session, *, create_dtos: List[SpanAnnotationCreateIntern]
    ) -> List[SpanAnnotationORM]:
        # first create the SpanText
        span_texts_orm = crud_span_text.create_multi(
            db=db,
            create_dtos=[
                SpanTextCreate(text=create_dto.span_text) for create_dto in create_dtos
            ],
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
        db.commit()

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            set([create_dto.annotation_document_id for create_dto in create_dtos])
        )
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return db_objs

    def create_bulk(
        self, db: Session, *, user_id: int, create_dtos: List[SpanAnnotationCreate]
    ) -> List[SpanAnnotationORM]:
        # group by user and sdoc_id
        # identify codes
        annotations_by_user_sdoc = {
            (user_id, create_dto.sdoc_id): [] for create_dto in create_dtos
        }
        for create_dto in create_dtos:
            annotations_by_user_sdoc[(user_id, create_dto.sdoc_id)].append(create_dto)

        # find or create annotation documents for each user and sdoc_id
        adoc_id_by_user_sdoc = {}
        for user_id, sdoc_id in annotations_by_user_sdoc.keys():
            adoc_id_by_user_sdoc[(user_id, sdoc_id)] = crud_adoc.exists_or_create(
                db=db, user_id=user_id, sdoc_id=sdoc_id
            ).id

        # create the annotations
        return self.create_multi(
            db=db,
            create_dtos=[
                SpanAnnotationCreateIntern(
                    begin=create_dto.begin,
                    end=create_dto.end,
                    span_text=create_dto.span_text,
                    begin_token=create_dto.begin_token,
                    end_token=create_dto.end_token,
                    code_id=create_dto.code_id,
                    annotation_document_id=adoc_id_by_user_sdoc[
                        (user_id, create_dto.sdoc_id)
                    ],
                )
                for create_dto in create_dtos
            ],
        )

    def read_by_project(
        self,
        db: Session,
        *,
        project_id: int,
    ) -> List[SpanAnnotationORM]:
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

    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
        exclude_disabled_codes: bool = True,
    ) -> List[SpanAnnotationORM]:
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
        user_ids: List[int],
        sdoc_id: int,
        exclude_disabled_codes: bool = True,
    ) -> List[SpanAnnotationORM]:
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
    ) -> List[SpanAnnotationORM]:
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
        self, db: Session, *, update_dtos: List[SpanAnnotationUpdateBulk]
    ) -> List[SpanAnnotationORM]:
        return [
            self.update(
                db,
                id=update_dto.span_annotation_id,
                update_dto=SpanAnnotationUpdate(code_id=update_dto.code_id),
            )
            for update_dto in update_dtos
        ]

    def remove(self, db: Session, *, id: int) -> SpanAnnotationORM:
        span_anno = super().remove(db, id=id)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=span_anno.annotation_document_id)

        return span_anno

    def remove_bulk(self, db: Session, *, ids: List[int]) -> List[SpanAnnotationORM]:
        span_annos = []
        for id in ids:
            span_annos.append(self.remove(db, id=id))

        # find the annotation document ids
        adoc_ids = {span_anno.annotation_document_id for span_anno in span_annos}

        # update the annotation documents' timestamp
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        return span_annos

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
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
        # group_db_obj = crud_span_group.read(db=db, id=group_id)
        # span_db_obj.document_tags.remove(group_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
