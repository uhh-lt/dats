from typing import Union

from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.user import crud_user
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.orm.action import ActionORM, ActionTargetORM
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.filter import FilterORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.query import QueryORM
from app.core.data.orm.source_document import SourceDocumentORM, SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.orm.user import UserORM


class CRUDObjectHandle(CRUDBase[ObjectHandleORM, ObjectHandleCreate, None]):
    __crud_dict = {
        "action_id": None,
        "action_target_id": None,
        "annotation_document_id": crud_adoc,
        "code_id": crud_code,
        "current_code_id": crud_current_code,
        "document_tag_id": crud_document_tag,
        "filter_id": None,
        "project_id": crud_project,
        "query_id": None,
        "source_document_id": crud_sdoc,
        "source_document_metadata_id": crud_sdoc_meta,
        "span_annotation_id": crud_span_anno,
        "span_group_id": crud_span_group,
        "user_id": crud_user
    }

    def resolve_handled_object(self, db: Session, handle: ObjectHandleORM) -> Union[ActionORM,
                                                                                    ActionTargetORM,
                                                                                    AnnotationDocumentORM,
                                                                                    CodeORM,
                                                                                    CurrentCodeORM,
                                                                                    DocumentTagORM,
                                                                                    FilterORM,
                                                                                    ProjectORM,
                                                                                    QueryORM,
                                                                                    SourceDocumentORM,
                                                                                    SourceDocumentMetadataORM,
                                                                                    SpanAnnotationORM,
                                                                                    SpanGroupORM,
                                                                                    UserORM,
                                                                                    None]:

        for target_id in self.__crud_dict.keys():
            if getattr(handle, target_id):
                return self.__crud_dict[target_id].read(db=db, id=getattr(handle, target_id))


crud_object_handle = CRUDObjectHandle(ObjectHandleORM)
