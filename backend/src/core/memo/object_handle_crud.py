from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_crud import crud_code
from core.code.code_orm import CodeORM
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_orm import MemoORM
from core.memo.object_handle_dto import ObjectHandleCreate
from core.memo.object_handle_orm import ObjectHandleORM
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_orm import TagORM
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from repos.db.crud_base import CRUDBase, NoSuchElementError, UpdateNotAllowed
from repos.db.sql_repo import SQLRepo


class CRUDObjectHandle(CRUDBase[ObjectHandleORM, ObjectHandleCreate, UpdateNotAllowed]):
    __obj_id_crud_map = {
        "code_id": crud_code,
        "tag_id": crud_tag,
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
        "tag_id": TagORM,
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
                with SQLRepo().db_session() as sess:
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
    ) -> (
        CodeORM
        | TagORM
        | ProjectORM
        | SourceDocumentORM
        | SpanAnnotationORM
        | SentenceAnnotationORM
        | BBoxAnnotationORM
        | SpanGroupORM
        | UserORM
        | MemoORM
        | None
    ):
        target_id = None
        for target_id in self.__obj_id_crud_map.keys():
            if getattr(handle, target_id):
                return self.__obj_id_crud_map[target_id].read(
                    db=db, id=getattr(handle, target_id)
                )

        raise KeyError(f"Unknown target_id: {target_id}!")


crud_object_handle = CRUDObjectHandle(ObjectHandleORM)
