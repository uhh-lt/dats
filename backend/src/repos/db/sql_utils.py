from typing import Optional

from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.annotation.span_text_orm import SpanTextORM
from core.memo.object_handle_crud import crud_object_handle
from core.memo.object_handle_orm import ObjectHandleORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from repos.db.orm_base import ORMBase
from repos.db.sql_repo import SQLRepo
from sqlalchemy import Integer, func, inspect
from sqlalchemy.dialects.postgresql import ARRAY, array_agg
from sqlalchemy.orm import InstrumentedAttribute


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


def aggregate_two_ids(
    column1: InstrumentedAttribute, column2: InstrumentedAttribute, label: str
):
    return func.array_remove(
        func.array_cat(
            array_agg(func.distinct(column1), type_=ARRAY(Integer)),
            array_agg(func.distinct(column2), type_=ARRAY(Integer)),
        ),
        None,
        type_=ARRAY(Integer),
    ).label(label)


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
        with SQLRepo().db_session() as db:
            maybe_orm = crud_object_handle.resolve_handled_object(db=db, handle=orm)

            if maybe_orm is None:
                return None

            orm = maybe_orm

    with SQLRepo().db_session() as db:
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
            or isinstance(orm, SentenceAnnotationORM)
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
