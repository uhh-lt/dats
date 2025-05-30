from typing import Union

from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase, NoSuchElementError, UpdateNotAllowed
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.user import crud_user
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService


class CRUDObjectHandle(CRUDBase[ObjectHandleORM, ObjectHandleCreate, UpdateNotAllowed]):
    __obj_id_crud_map = {
        "code_id": crud_code,
        "document_tag_id": crud_document_tag,
        "project_id": crud_project,
        "source_document_id": crud_sdoc,
        "span_annotation_id": crud_span_anno,
        "bbox_annotation_id": crud_bbox_anno,
        "sentence_annotation_id": crud_sentence_anno,
        "span_group_id": crud_span_group,
        "user_id": crud_user,
        "memo_id": crud_memo,
    }

    __obj_id_orm_type_map = {
        "code_id": CodeORM,
        "document_tag_id": DocumentTagORM,
        "project_id": ProjectORM,
        "source_document_id": SourceDocumentORM,
        "span_annotation_id": SpanAnnotationORM,
        "bbox_annotation_id": BBoxAnnotationORM,
        "sentence_annotation_id": SentenceAnnotationORM,
        "span_group_id": SpanGroupORM,
        "user_id": UserORM,
        "memo_id": MemoORM,
    }

    def create(self, db: Session, *, create_dto: ObjectHandleCreate) -> ObjectHandleORM:
        try:
            return super().create(db=db, create_dto=create_dto)
        except IntegrityError as e:
            # Flo: return existing OH when UC constraint fails
            if isinstance(e.orig, UniqueViolation):
                db.close()  # Flo: close the session because we have to start a new transaction
                with SQLService().db_session() as sess:
                    obj_id_key, obj_id_val = next(
                        filter(
                            lambda item: item[0] is not None and item[1] is not None,
                            create_dto.model_dump().items(),
                        ),
                        (None, None),
                    )
                    if obj_id_key is not None and obj_id_val is not None:
                        return self.read_by_attached_object_id(
                            db=sess, obj_id_key=obj_id_key, obj_id_val=obj_id_val
                        )
                    raise e
            else:
                # Flo: re-raise Exception since it's not a UC Violation
                raise e

    def read_by_attached_object_id(
        self, db: Session, obj_id_key: str, obj_id_val: int
    ) -> ObjectHandleORM:
        if obj_id_key not in self.__obj_id_orm_type_map.keys():
            raise ValueError("Unknown Object ID!")

        obj_type = self.__obj_id_orm_type_map[obj_id_key]

        db_obj = (
            db.query(self.model)
            .filter(getattr(self.model, obj_id_key) == obj_id_val)
            .first()
        )
        if db_obj is None:
            raise NoSuchElementError(obj_type, id=obj_id_val)
        return db_obj

    def resolve_handled_object(
        self, db: Session, handle: ObjectHandleORM
    ) -> Union[
        CodeORM,
        DocumentTagORM,
        ProjectORM,
        SourceDocumentORM,
        SpanAnnotationORM,
        SentenceAnnotationORM,
        BBoxAnnotationORM,
        SpanGroupORM,
        UserORM,
        MemoORM,
        None,
    ]:
        target_id = None
        for target_id in self.__obj_id_crud_map.keys():
            if getattr(handle, target_id):
                return self.__obj_id_crud_map[target_id].read(
                    db=db, id=getattr(handle, target_id)
                )

        raise KeyError(f"Unknown target_id: {target_id}!")


crud_object_handle = CRUDObjectHandle(ObjectHandleORM)
