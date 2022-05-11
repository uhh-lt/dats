from typing import List

from fastapi.encoders import jsonable_encoder
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.dto import ProjectRead
from app.core.data.dto.memo import MemoCreate, MemoInDB, MemoRead, AttachedObjectType
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.dto.search import ElasticSearchMemoCreate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.search.elasticsearch_service import ElasticSearchService


class CRUDMemo(CRUDBase[MemoORM, MemoCreate, None]):

    def create(self, db: Session, *, create_dto: MemoCreate) -> MemoORM:
        raise NotImplementedError()

    def read_by_user_and_project(self, db: Session, user_id: int, proj_id: int) -> List[MemoORM]:

        return db.query(self.model).filter(self.model.user_id == user_id,
                                           self.model.project_id == proj_id).all()

    def remove_by_user_and_project(self, db: Session, user_id: int, proj_id: int) -> List[int]:
        statement = delete(self.model).where(self.model.user_id == user_id,
                                             self.model.project_id == proj_id).returning(self.model.id)
        removed_ids = db.execute(statement).fetchall()
        db.commit()
        return list(map(lambda t: t[0], removed_ids))

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

    def create_for_code(self, db: Session, code_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Code
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(code_id=code_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=code_id,
                                         attached_object_type=AttachedObjectType.code)
        return db_obj

    def create_for_project(self, db: Session, project_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the Project
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(project_id=project_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=project_id,
                                         attached_object_type=AttachedObjectType.project)
        return db_obj

    def create_for_sdoc(self, db: Session, sdoc_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the SourceDocument
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(source_document_id=sdoc_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=sdoc_id,
                                         attached_object_type=AttachedObjectType.source_document)
        return db_obj

    def create_for_adoc(self, db: Session, adoc_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the AnnotationDocument
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(annotation_document_id=adoc_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=adoc_id,
                                         attached_object_type=AttachedObjectType.annotation_document)
        return db_obj

    def create_for_span_annotation(self, db: Session, span_anno_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the SpanAnnotation
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(span_annotation_id=span_anno_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=span_anno_id,
                                         attached_object_type=AttachedObjectType.span_annotation)
        return db_obj

    def create_for_span_group(self, db: Session, span_group_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the SpanGroup
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(span_group_id=span_group_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=span_group_id,
                                         attached_object_type=AttachedObjectType.span_group)
        return db_obj

    def create_for_bbox_annotation(self, db: Session, bbox_anno_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the BBoxAnnotation
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(bbox_annotation_id=bbox_anno_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=bbox_anno_id,
                                         attached_object_type=AttachedObjectType.bbox_annotation)
        return db_obj

    def create_for_document_tag(self, db: Session, doc_tag_id: int, create_dto: MemoCreate) -> MemoORM:
        # create an ObjectHandle for the DocumentTag
        oh_db_obj = crud_object_handle.create(db=db,
                                              create_dto=ObjectHandleCreate(document_tag_id=doc_tag_id))
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(memo_orm=db_obj,
                                         attached_object_id=doc_tag_id,
                                         attached_object_type=AttachedObjectType.document_tag)
        return db_obj

    # TODO Flo: Not sure if this actually belongs here...
    @staticmethod
    def get_memo_read_dto_from_orm(db: Session, db_obj: MemoORM) -> MemoRead:
        attached_to = crud_object_handle.resolve_handled_object(db=db, handle=db_obj.attached_to)
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        if isinstance(attached_to, CodeORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.code)
        elif isinstance(attached_to, SpanAnnotationORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.span_annotation)
        elif isinstance(attached_to, SpanGroupORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.span_group)
        elif isinstance(attached_to, BBoxAnnotationORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.bbox_annotation)
        elif isinstance(attached_to, AnnotationDocumentORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.annotation_document)
        elif isinstance(attached_to, SourceDocumentORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.source_document)
        elif isinstance(attached_to, ProjectORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.project)
        elif isinstance(attached_to, DocumentTagORM):
            return MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                            attached_object_id=attached_to.id,
                            attached_object_type=AttachedObjectType.document_tag)

    @staticmethod
    def __add_memo_to_elasticsearch(memo_orm: MemoORM,
                                    attached_object_id: int,
                                    attached_object_type: AttachedObjectType):

        esmemo = ElasticSearchMemoCreate(title=memo_orm.title,
                                         content=memo_orm.content,
                                         memo_id=memo_orm.id,
                                         project_id=memo_orm.project_id,
                                         user_id=memo_orm.user_id,
                                         attached_object_id=attached_object_id,
                                         attached_object_type=attached_object_type)
        ElasticSearchService().add_memo_to_index(proj=ProjectRead.from_orm(memo_orm.project), esmemo=esmemo)


crud_memo = CRUDMemo(MemoORM)
