from typing import Union

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.dto.memo import MemoCreate, MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, \
    MemoReadProject, MemoReadSourceDocument, MemoInDB
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDMemo(CRUDBase[MemoORM, MemoCreate, None]):

    def create(self, db: Session, *, create_dto: MemoCreate) -> MemoORM:
        raise NotImplementedError()

    def exists_for_user_and_object_handle(self, db: Session, *, user_id: int, attached_to_id: int) -> bool:
        return db.query(self.model.id).filter(self.model.user_idr == user_id,
                                              self.model.attached_to_id == attached_to_id).first() is not None

    def __create_memo(self, create_dto: MemoCreate, db: Session, oh_db_obj: ObjectHandleORM):
        # create the Memo
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["attached_to_id"] = oh_db_obj.id
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_for_code(self, db: Session, id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Code
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(code_id=id))

        return self.__create_memo(create_dto, db, oh_db_obj)

    def create_for_project(self, db: Session, project_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Project
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(project_id=project_id))

        return self.__create_memo(create_dto, db, oh_db_obj)

    # TODO Flo: Not sure if this actually belongs here...
    @staticmethod
    def get_memo_read_dto_from_orm(db: Session, db_obj: MemoORM) -> Union[MemoReadCode,
                                                                          MemoReadSpanAnnotation,
                                                                          MemoReadAnnotationDocument,
                                                                          MemoReadSourceDocument,
                                                                          MemoReadProject]:
        attached_to = crud_object_handle.resolve_handled_object(db=db, handle=db_obj.attached_to)
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        if isinstance(attached_to, CodeORM):
            return MemoReadCode(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                attached_code_id=attached_to.id)
        elif isinstance(attached_to, SpanAnnotationORM):
            return MemoReadSpanAnnotation(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                          attached_span_annotation_id=attached_to.id)
        elif isinstance(attached_to, AnnotationDocumentORM):
            return MemoReadAnnotationDocument(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                              attached_annotation_document_id=attached_to.id)
        elif isinstance(attached_to, SourceDocumentORM):
            return MemoReadSourceDocument(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                          attached_source_document_id=attached_to.id)
        elif isinstance(attached_to, ProjectORM):
            return MemoReadProject(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                                   attached_project_id=attached_to.id)


crud_memo = CRUDMemo(MemoORM)
