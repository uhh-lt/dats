from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.annotation_exceptions import EmptySpanAnnotationError
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreateIntern,
    SpanAnnotationUpdate,
)
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_text_crud import crud_span_text
from core.annotation.span_text_dto import SpanTextCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.object_handle_orm import ObjectHandleORM
from repos.db.crud_base import BATCH_SIZE, SQLCRUDBase


class CRUDSpanAnnotation(
    SQLCRUDBase[SpanAnnotationORM, SpanAnnotationCreateIntern, SpanAnnotationUpdate]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[SpanAnnotationCreateIntern],
    ) -> list[SpanAnnotationORM]:
        if not create_dtos:
            return []

        # every write path creates span annotations here, so the check is here too
        for create_dto in create_dtos:
            self._assert_not_empty(
                begin=create_dto.begin,
                end=create_dto.end,
                begin_token=create_dto.begin_token,
                end_token=create_dto.end_token,
            )

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
        db.flush()

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
    ) -> list[SpanAnnotationORM]:
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
    ) -> SpanAnnotationORM | None:
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
    ) -> list[SpanAnnotationORM]:
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

        db_objs: list[SpanAnnotationORM] = []
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
            .options(*self._load_options())
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
        if not user_ids:
            return []

        db_objs: list[SpanAnnotationORM] = []
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
            .options(*self._load_options())
            .join(self.model.annotation_document)
            .filter(
                self.model.code_id == code_id, AnnotationDocumentORM.user_id == user_id
            )
        )
        if exclude_disabled_codes:
            query = query.join(self.model.code).where(CodeORM.enabled == True)  # noqa: E712

        return query.all()

    def read_by_codes(
        self,
        db: Session,
        *,
        code_ids: list[int],
    ) -> list[SpanAnnotationORM]:
        if not code_ids:
            return []

        db_objs: list[SpanAnnotationORM] = []
        for i in range(0, len(code_ids), BATCH_SIZE):
            batch_code_ids = code_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model)
                .options(*self._load_options())
                .filter(self.model.code_id.in_(batch_code_ids))
            )
            db_objs.extend(query.all())
        return db_objs

    def read_by_user_sdocs_codes(
        self, db: Session, *, user_id: int, sdoc_ids: list[int], code_ids: list[int]
    ) -> list[SpanAnnotationORM]:
        if not sdoc_ids or not code_ids:
            return []

        db_objs: list[SpanAnnotationORM] = []
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model)
                .options(*self._load_options())
                .join(self.model.annotation_document)
                .filter(
                    AnnotationDocumentORM.user_id == user_id,
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    self.model.code_id.in_(code_ids),
                )
            )
            db_objs.extend(query.all())
        return db_objs

    ### UPDATE OPERATIONS ###

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[SpanAnnotationUpdate],
    ) -> list[SpanAnnotationORM]:
        # a resize sets all positions at once (see SpanAnnotationUpdate)
        for update_dto in update_dtos:
            if (
                update_dto.begin is not None
                and update_dto.end is not None
                and update_dto.begin_token is not None
                and update_dto.end_token is not None
            ):
                self._assert_not_empty(
                    begin=update_dto.begin,
                    end=update_dto.end,
                    begin_token=update_dto.begin_token,
                    end_token=update_dto.end_token,
                )

        span_annos = super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

        # resized spans refer to the SpanText of their new text
        resized = [
            (span_anno, update_dto.span_text)
            for span_anno, update_dto in zip(span_annos, update_dtos)
            if update_dto.span_text is not None
        ]
        if resized:
            span_texts = crud_span_text.create_multi(
                db=db,
                create_dtos=[SpanTextCreate(text=text) for _, text in resized],
            )
            for (span_anno, _), span_text in zip(resized, span_texts):
                span_anno.span_text_id = span_text.id
            db.flush()

        # update the annotation documents' timestamp
        crud_adoc.update_timestamps(
            db=db,
            ids=list({span_anno.annotation_document_id for span_anno in span_annos}),
        )

        return span_annos

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
        # find all span annotations to be removed
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

    def delete_by_user_sdocs_codes(
        self, db: Session, *, user_id: int, sdoc_ids: list[int], code_ids: list[int]
    ) -> list[int]:
        if not sdoc_ids or not code_ids:
            return []

        # find all annotations to be removed
        anno_ids: list[int] = []
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model.id)
                .join(self.model.annotation_document)
                .filter(
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    AnnotationDocumentORM.user_id == user_id,
                    self.model.code_id.in_(code_ids),
                )
            )
            anno_ids.extend(row[0] for row in query.all())

        # delete them (updates the annotation documents' timestamp)
        self.delete_multi(db=db, ids=anno_ids)

        return anno_ids

    ### OTHER OPERATIONS ###

    def remove_from_all_span_groups(
        self, db: Session, *, span_id: int
    ) -> SpanAnnotationORM:
        db_obj = self.read(db=db, id=span_id)
        db_obj.span_groups = []
        db.flush()
        db.refresh(db_obj)
        return db_obj

    def add_to_span_group(
        self, db: Session, *, span_id: int, group_id: int
    ) -> SpanAnnotationORM:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.span_groups.append(group_db_obj)
        db.add(span_db_obj)
        db.flush()
        db.refresh(span_db_obj)
        return span_db_obj

    def remove_from_span_group(
        self, db: Session, *, span_id: int, group_id: int
    ) -> SpanAnnotationORM:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        if group_db_obj in span_db_obj.span_groups:
            span_db_obj.span_groups.remove(group_db_obj)
        db.flush()
        db.refresh(span_db_obj)
        return span_db_obj

    def count_by_codes_and_sdocs_and_user(
        self,
        db: Session,
        *,
        code_ids: list[int],
        sdoc_ids: list[int],
        user_id: int,
    ) -> dict[int, int]:
        if not code_ids or not sdoc_ids:
            return {}

        results: dict[int, int] = {}
        for i in range(0, len(sdoc_ids), BATCH_SIZE):
            batch_sdoc_ids = sdoc_ids[i : i + BATCH_SIZE]
            query = (
                db.query(self.model.code_id, func.count(self.model.id))
                .join(self.model.annotation_document)
                .where(
                    self.model.code_id.in_(code_ids),
                    AnnotationDocumentORM.source_document_id.in_(batch_sdoc_ids),
                    AnnotationDocumentORM.user_id == user_id,
                )
                .group_by(self.model.code_id)
            )
            for code_id, count in query.all():
                results[code_id] = results.get(code_id, 0) + count
        return results

    def _assert_not_empty(
        self, *, begin: int, end: int, begin_token: int, end_token: int
    ) -> None:
        """Span annotations cover at least one character and one token (the ends
        are exclusive)."""
        if begin >= end or begin_token >= end_token:
            raise EmptySpanAnnotationError(
                begin=begin, end=end, begin_token=begin_token, end_token=end_token
            )

    def _load_options(self) -> list[ExecutableOption]:
        # everything the Read DTO reads through ORM properties
        return [
            selectinload(self.model.annotation_document),  # sdoc_id, user_id
            selectinload(self.model.span_text),  # text
            selectinload(self.model.span_groups),  # group_ids
            selectinload(self.model.object_handle).selectinload(
                ObjectHandleORM.attached_memos
            ),  # memo_ids
        ]

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


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
