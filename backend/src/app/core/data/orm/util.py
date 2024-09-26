from typing import Optional

from sqlalchemy import inspect

from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.dto.action import ActionTargetObjectType
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.orm_base import ORMBase
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService


def get_parent_project_id(orm: ORMBase) -> Optional[int]:
    proj_id = getattr(orm, "project_id", None)
    if proj_id is not None:
        return proj_id

    if isinstance(orm, ProjectORM):
        return orm.id
    if isinstance(orm, UserORM) or isinstance(orm, SpanTextORM):
        # project wide ORMs
        return None

    if isinstance(orm, ObjectHandleORM):
        with SQLService().db_session() as db:
            maybe_orm = crud_object_handle.resolve_handled_object(db=db, handle=orm)

            if maybe_orm is None:
                return None

            orm = maybe_orm

    with SQLService().db_session() as db:
        if inspect(orm).detached:
            # TODO this might be dangerous to use in authorization methods
            # which will get called for every request!
            # OTOH, authorization logic *should* only call it for objects
            # that are already in the db
            db.add(orm)
        if isinstance(orm, AnnotationDocumentORM) or isinstance(
            orm, SourceDocumentMetadataORM
        ):
            return orm.source_document.project_id
        elif (
            isinstance(orm, SpanAnnotationORM)
            or isinstance(orm, BBoxAnnotationORM)
            or isinstance(orm, SpanGroupORM)
        ):
            return orm.annotation_document.source_document.project_id

    # TODO missing case
    # - SourceDocumentLinkORM

    raise NotImplementedError(f"Unknown ORM: {type(orm)}")


def get_orm_user_id(orm: ORMBase) -> int:
    proj_id = getattr(orm, "user_id", None)
    if proj_id is not None:
        return proj_id

    raise NotImplementedError(f"Object has no user_id: {type(orm)}")


def get_action_target_type(orm: ORMBase) -> Optional[ActionTargetObjectType]:
    if isinstance(orm, MemoORM):
        return ActionTargetObjectType.memo
    elif isinstance(orm, CodeORM):
        return ActionTargetObjectType.code
    elif isinstance(orm, AnnotationDocumentORM):
        return ActionTargetObjectType.annotation_document
    elif isinstance(orm, SourceDocumentORM):
        return ActionTargetObjectType.source_document
    elif isinstance(orm, DocumentTagORM):
        return ActionTargetObjectType.document_tag
    elif isinstance(orm, SpanAnnotationORM):
        return ActionTargetObjectType.span_annotation
    elif isinstance(orm, BBoxAnnotationORM):
        return ActionTargetObjectType.bbox_annotation
    elif isinstance(orm, SpanGroupORM):
        return ActionTargetObjectType.span_group
    elif isinstance(orm, ProjectORM):
        return ActionTargetObjectType.project
    else:
        return None
